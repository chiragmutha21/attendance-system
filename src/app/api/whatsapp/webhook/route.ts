import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSecureToken } from "@/lib/utils";
import { getCompanyIdFromRequest } from "@/lib/tenant";

// GET handler for Meta WhatsApp webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "attendance_verify_secret";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp Webhook verified successfully.");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST handler for receiving WhatsApp messages
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    console.log("Received WhatsApp webhook event:", JSON.stringify(body, null, 2));

    // Check if it's a simulated message from our sandbox UI
    const isSandboxSim = body.isSandbox === true;
    
    let senderPhone = "";
    let messageText = "";

    if (isSandboxSim) {
      senderPhone = body.senderPhone;
      messageText = (body.messageText || "").trim().toUpperCase();
    } else {
      // Standard Meta WhatsApp Payload parsing
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message || message.type !== "text") {
        // Return 200 to acknowledge receipt of non-text (e.g. status updates, images) to avoid Meta retrying
        return NextResponse.json({ success: true, message: "Ignored non-text message" });
      }

      senderPhone = message.from; // e.g. "919876543210"
      messageText = (message.text?.body || "").trim().toUpperCase();
    }

    if (!senderPhone) {
      return NextResponse.json({ error: "Sender phone not found" }, { status: 400 });
    }

    // Process only if message is a valid command (HI, HII, ATTENDANCE, etc.)
    const validCommands = ["HI", "HII", "ATTENDANCE", "CHECKIN", "CHECK IN", "PRESENT"];
    const isValidCommand = validCommands.includes(messageText);

    if (!isValidCommand) {
      const reply = "This word is not allowed. Please type 'HI' or 'ATTENDANCE'.";
      if (isSandboxSim) {
        return NextResponse.json({ success: true, reply });
      } else {
        await sendWhatsAppMessage(senderPhone, reply);
        return NextResponse.json({ success: true });
      }
    }

    // Standardize phone number for matching: strip out '+', spaces, dashes, etc.
    const cleanSenderPhone = senderPhone.replace(/\D/g, "");

    // Search for active employee in DB
    // Match logic: check if the DB mobileNumber contains the sender's phone, or vice-versa
    const employees = await db.employee.findMany({
      where: { companyId, status: "active" },
    });

    const employee = employees.find(emp => {
      const cleanEmpPhone = emp.mobileNumber.replace(/\D/g, "");
      return cleanEmpPhone.endsWith(cleanSenderPhone) || cleanSenderPhone.endsWith(cleanEmpPhone);
    });

    if (!employee) {
      const reply = `Access Denied: The mobile number (${senderPhone}) is not registered in the system or is marked inactive. Please contact HR.`;
      if (isSandboxSim) {
        return NextResponse.json({ success: true, reply });
      } else {
        await sendWhatsAppMessage(senderPhone, reply);
        return NextResponse.json({ success: true });
      }
    }

    // Create unique secure token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes in future

    // Save token in DB
    await db.attendanceLink.create({
      data: {
        companyId,
        employeeId: employee.employeeId,
        token: token,
        expiresAt: expiresAt,
        used: false,
      },
    });

    const requestOrigin = request.headers.get("origin") || new URL(request.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
    const checkInLink = `${appUrl}/attendance/${token}`;
    const replyMessage = `Hello ${employee.fullName},\n\nHere is your secure check-in link:\n${checkInLink}\n\n*Important notes:*\n1. Link expires in 5 minutes.\n2. Link works only once.\n3. GPS and Camera permissions are mandatory.`;

    if (isSandboxSim || process.env.MOCK_MODE === "true") {
      console.log(`[MOCK MODE] Outbound WhatsApp to ${senderPhone}: ${replyMessage}`);
      return NextResponse.json({
        success: true,
        reply: replyMessage,
        token: token,
        link: checkInLink,
      });
    } else {
      // Send real WhatsApp message in production
      await sendWhatsAppMessage(senderPhone, replyMessage);
      return NextResponse.json({ success: true });
    }

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// Outbound message function using WhatsApp Cloud API
async function sendWhatsAppMessage(toPhone: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("WhatsApp API credentials missing. Printing output locally:");
    console.log(`[OUTBOUND SMS] TO: ${toPhone} | MSG: ${text}`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "text",
        text: { body: text },
      }),
    });

    const resJson = await response.json();
    if (!response.ok) {
      console.error("Meta WhatsApp Cloud API error response:", resJson);
      throw new Error(resJson.error?.message || "Failed to send WhatsApp message");
    }

    console.log(`WhatsApp message sent successfully to ${toPhone}. Message ID: ${resJson.messages?.[0]?.id}`);
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
  }
}
