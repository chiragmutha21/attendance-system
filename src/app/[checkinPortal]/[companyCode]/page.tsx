"use client";

import { useParams } from "next/navigation";
import CheckInPage from "../../checkin/page";
import CheckOutPage from "../../checkout/page";

export default function DynamicPortalPage() {
  const params = useParams();
  const checkinPortal = (params?.checkinPortal as string) || "";

  if (checkinPortal.startsWith("checkin-")) {
    return <CheckInPage />;
  } else if (checkinPortal.startsWith("checkout-")) {
    return <CheckOutPage />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#08090d", color: "#fff" }}>
      <h2>404 - Portal Page Not Found</h2>
    </div>
  );
}
