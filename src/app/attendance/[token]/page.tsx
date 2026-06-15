"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Camera, MapPin, CheckCircle, XCircle, RefreshCw, Loader2, Sparkles } from "lucide-react";
import Script from "next/script";
import styles from "./attendance.module.css";

interface Employee {
  employeeId: string;
  fullName: string;
  department: string;
  role: string;
  registeredFaceImage?: string;
}

export default function AttendancePage() {
  const params = useParams();
  const token = params?.token as string;

  console.log("AttendancePage - params:", params, "token:", token);

  // Verification & Loading States
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [returnCountdown, setReturnCountdown] = useState(3);
  const [isMock, setIsMock] = useState(false);
  const [settingConfig, setSettingConfig] = useState(false);

  // Face API loading & matching states
  const [faceApiScriptLoaded, setFaceApiScriptLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [faceVerificationError, setFaceVerificationError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>("");

  // Employee details
  const [employee, setEmployee] = useState<Employee | null>(null);

  // GPS States
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const expiryTimerRef = useRef<number | null>(null);

  // Camera & Image Capture States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFallbackCamera, setUseFallbackCamera] = useState(false);

  // 1. Verify token and start Geolocation on page load
  useEffect(() => {
    if (!token) {
      setErrorMsg("Security Token is missing. Please open the link received on WhatsApp.");
      setLoading(false);
      return;
    }

    verifyToken();
    requestGPS();

    return () => {
      // Stop video stream when component unmounts
      stopCamera();
      // Clear expiry timer
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, [token]);

  useEffect(() => {
    if (!successData?.success) return;

    setReturnCountdown(3);
    const interval = window.setInterval(() => {
      setReturnCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    const timeout = window.setTimeout(() => {
      window.close();
      if (window.history.length > 1) {
        window.history.back();
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [successData]);

  // 1.2 Dynamically load face-api.js script from CDN to bypass Next.js script load issues
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).faceapi) {
      setFaceApiScriptLoaded(true);
      return;
    }

    const scriptId = "face-api-cdn-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js";
      script.async = true;
      script.onload = () => {
        console.log("FaceAPI script loaded successfully from jsDelivr CDN.");
        setFaceApiScriptLoaded(true);
      };
      script.onerror = () => {
        setFaceVerificationError("Failed to download Face Recognition script from CDN. Please check your internet connection.");
      };
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", () => {
        setFaceApiScriptLoaded(true);
      });
    }
  }, []);

  // 1.5 Load face-api.js models when script is loaded
  useEffect(() => {
    if (faceApiScriptLoaded) {
      const loadModels = async () => {
        setModelsLoading(true);
        try {
          await loadFaceApiModels();
          setModelsLoaded(true);
        } catch (err: any) {
          console.error(err);
          setFaceVerificationError(err.message || "Failed to initialize face verification models.");
        } finally {
          setModelsLoading(false);
        }
      };
      loadModels();
    }
  }, [faceApiScriptLoaded]);

  // Helper to load image securely for face-api
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error("Failed to load registered face image. Ensure you are connected to the internet."));
      img.src = src;
    });
  };

  // Helper to load models
  const loadFaceApiModels = async () => {
    if (typeof window === "undefined" || !(window as any).faceapi) {
      throw new Error("FaceAPI library not loaded yet.");
    }
    const faceapi = (window as any).faceapi;
    try {
      if (!faceapi.nets.tinyFaceDetector.params || !faceapi.nets.faceLandmark68Net.params || !faceapi.nets.faceRecognitionNet.params) {
        const weightsUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(weightsUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(weightsUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(weightsUrl),
        ]);
        console.log("FaceAPI models loaded successfully from jsDelivr CDN.");
      }
    } catch (error) {
      console.error("Error loading FaceAPI models:", error);
      throw new Error("Failed to load face verification models. Please refresh the page.");
    }
  };

  // Helper to detect face with resolution and threshold fallbacks
  const detectFaceWithFallback = async (img: HTMLImageElement) => {
    const faceapi = (window as any).faceapi;
    if (!faceapi) return null;

    // Option 1: Moderate size and lower score threshold (robust standard webcam setting)
    console.log("[FaceAPI] Attempting detection: inputSize=320, scoreThreshold=0.20");
    let detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.20 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection) return detection;

    // Option 2: Larger input size for detecting faces with more details or further away
    console.log("[FaceAPI] Fallback detection: inputSize=512, scoreThreshold=0.15");
    detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.15 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection) return detection;

    // Option 3: Smaller input size for close-ups
    console.log("[FaceAPI] Fallback detection: inputSize=224, scoreThreshold=0.15");
    detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.15 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection;
  };

  // 2. Fetch API to verify token status
  const verifyToken = async () => {
    try {
      setLoading(true);
      const fetchUrl = `/api/attendance/verify?token=${token}`;
      console.log("verifyToken - fetching URL:", fetchUrl);
      const res = await fetch(fetchUrl);
      console.log("verifyToken - status:", res.status, "ok:", res.ok);
      const data = await res.json();
      console.log("verifyToken - received data:", data);

      if (!res.ok) {
        setErrorMsg(data.error || "Verification failed");
      } else {
        if (!data.employee.registeredFaceImage) {
          setErrorMsg("Face Verification Not Configured: No registered profile photo found. Please ask your administrator to upload a photo.");
          return;
        }
        setEmployee(data.employee);
        setIsMock(data.isMock || false);

        // Calculate remaining time and set up auto-expiry timer
        if (data.expiresAt) {
          const remainingMs = new Date(data.expiresAt).getTime() - Date.now();
          if (remainingMs <= 0) {
            setErrorMsg("This link has been expired.");
            return;
          }

          // Clear any existing timer
          if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
          }

          expiryTimerRef.current = window.setTimeout(() => {
            setErrorMsg("This link has been expired.");
            stopCamera();
          }, remainingMs);
        }

        // Once verified, start browser camera
        initCamera();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Failed to verify secure check-in link.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Setup Camera Stream
  const initCamera = async () => {
    setCameraError(null);
    try {
      stopCamera(); // Clean up existing streams

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn("In-browser camera stream failed, activating native fallback camera", err);
      setCameraError(err.message || "Camera access denied");
      setUseFallbackCamera(true);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Helper to resize any image to 400x400 for fast loading and processing
  const resizeImageTo400 = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          
          // Crop center square
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
          resolve(canvas.toDataURL("image/jpeg", 0.90));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    });
  };

  // 4. Capture Selfie from Video Stream
  const captureSelfie = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;

    const sourceSize = Math.min(video.videoWidth, video.videoHeight) || 1080;
    const outputSize = 400; // Downscale to 400x400 for super-fast face AI processing & upload
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, outputSize, outputSize);

      // Mirror image for realistic selfie perspective
      ctx.setTransform(-1, 0, 0, 1, outputSize, 0);

      // Crop video to a center square
      const sx = (video.videoWidth - sourceSize) / 2;
      const sy = (video.videoHeight - sourceSize) / 2;

      ctx.drawImage(video, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

      const base64Image = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedSelfie(base64Image);
      stopCamera();
    }
  };

  // 5. Fallback Camera File Upload Capture
  const handleFallbackCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resized = await resizeImageTo400(reader.result as string);
        setCapturedSelfie(resized);
      };
      reader.readAsDataURL(file);
    }
  };

  // 6. Reset captured image and start live camera again
  const retakeSelfie = () => {
    setCapturedSelfie(null);
    if (!useFallbackCamera) {
      initCamera();
    }
  };

  // 7. Request Geolocation Coordinates
  const requestGPS = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (err) => {
        console.error("GPS error:", err);
        let message = "GPS permission denied. Location is mandatory for check-in.";
        if (err.code === 2) message = "Location unavailable. Ensure GPS is enabled on your device.";
        if (err.code === 3) message = "GPS request timed out. Please try again.";
        setGpsError(message);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // 8. Submit Check-In
  const submitCheckIn = async () => {
    if (!capturedSelfie) {
      alert("Please capture your selfie before submitting.");
      return;
    }
    if (!gpsLocation) {
      alert("GPS location coordinates are required. Please enable location permissions.");
      return;
    }

    setSubmitting(true);
    setFaceVerificationError(null);
    setVerificationStatus("Initializing face AI verification...");

    try {
      if (!employee?.registeredFaceImage) {
        throw new Error("Face Verification Not Configured: No registered profile photo found. Please ask your administrator to upload a photo.");
      }

      console.log("Starting client-side face verification...");
      const faceapi = (window as any).faceapi;
      if (!faceapi) {
        throw new Error("Face recognition library is not loaded yet. Please wait a few seconds and try again.");
      }

      // Ensure models are loaded
      setVerificationStatus("Loading face detection models...");
      await loadFaceApiModels();

      // Load both images
      setVerificationStatus("Processing live selfie...");
      const selfieImg = await loadImage(capturedSelfie);

      setVerificationStatus("Extracting selfie landmarks...");
      const selfieDetection = await detectFaceWithFallback(selfieImg);

      if (!selfieDetection) {
        throw new Error("No face detected in your live selfie. Please align your face clearly in the center of the camera and try again.");
      }

      setVerificationStatus("Processing registered profile photo...");
      const registeredImg = await loadImage(employee.registeredFaceImage);

      setVerificationStatus("Extracting registered face landmarks...");
      const registeredDetection = await detectFaceWithFallback(registeredImg);

      if (!registeredDetection) {
        throw new Error("Could not detect a face in the registered profile photo. Please contact your administrator to upload a clearer photo.");
      }

      setVerificationStatus("Comparing face prints...");
      const distance = faceapi.euclideanDistance(selfieDetection.descriptor, registeredDetection.descriptor);
      const success = distance <= 0.45;

      console.log(`Face match verified successfully with Euclidean distance: ${distance.toFixed(4)}`);

      if (!success) {
        setSuccessData({
          success: false,
          error: "Face Verification Failed: The captured selfie does not match the registered profile image."
        });
        return;
      }

      setVerificationStatus("Submitting attendance to server...");
      const payload = {
        token: token,
        selfie: capturedSelfie,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceInfo: navigator.userAgent,
      };

      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSuccessData({
          success: false,
          error: data.error || "Failed to log attendance",
        });
      } else {
        setSuccessData({
          success: true,
          record: {
            ...data.record,
            distance: distance
          },
        });
      }
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      setSuccessData({
        success: false,
        error: err.message || "Network error. Failed to submit check-in."
      });
    } finally {
      setSubmitting(false);
      setVerificationStatus("");
    }
  };

  const handleTryAgain = () => {
    setSuccessData(null);
    setCapturedSelfie(null);
    if (!useFallbackCamera) {
      initCamera();
    }
  };

  const setAsOfficeLocation = async () => {
    if (!gpsLocation) return;
    setSettingConfig(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          radius: 200,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Office Geofence coordinates updated to your current position!");
        setSuccessData(null);
        // Auto submit check-in again
        setTimeout(() => {
          submitCheckIn();
        }, 500);
      } else {
        alert(data.error || "Failed to update settings.");
      }
    } catch (err) {
      console.error(err);
      alert("Error configuring coordinates.");
    } finally {
      setSettingConfig(false);
    }
  };

  // --- Render Functions ---

  // A. Page Initial Loading State
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} glass-panel flex-center`} style={{ flexDirection: "column", gap: "16px" }}>
          <Loader2 className="animate-spin" size={40} color="var(--color-secondary)" />
          <p style={{ color: "var(--text-secondary)" }}>Verifying secure link details...</p>
        </div>
      </div>
    );
  }

  // B. Page Error State (e.g., Invalid or Expired Token)
  if (errorMsg) {
    const isExpiry = errorMsg.toLowerCase().includes("expired");
    return (
      <div className={styles.container}>
        <div className={styles.glowBlob}></div>
        <div className={styles.card} style={{ borderTop: "4px solid var(--color-danger)" }}>
          <div className="glass-panel" style={{ padding: "32px 24px", borderRadius: "16px", textAlign: "center" }}>
            <div className={`${styles.stateIcon} ${styles.errorIconBg} mx-auto`} style={{ margin: "0 auto 20px" }}>
              <XCircle size={32} />
            </div>
            <h2 className={styles.stateTitle}>{isExpiry ? "Link Expired" : "Access Denied"}</h2>
            <p className={styles.stateDesc}>{errorMsg}</p>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "16px", marginBottom: "24px" }}>
              Please request a new check-in link by sending <strong>"HI"</strong> or <strong>"ATTENDANCE"</strong> to the official WhatsApp number.
            </div>
            
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = "/";
                }
              }}
              style={{ width: "100%" }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // C. Submission Status State (Success or Error Screen)
  if (successData) {
    const isSuccess = successData.success;
    
    return (
      <div className={styles.container}>
        <div className={styles.glowBlob}></div>
        <div className={styles.card} style={{ borderTop: isSuccess ? "4px solid var(--color-success)" : "4px solid var(--color-danger)" }}>
          <div className="glass-panel" style={{ padding: "32px 24px", borderRadius: "16px" }}>
            {isSuccess ? (
              <div className={styles.successState}>
                <div className={`${styles.stateIcon} ${styles.successIconBg}`}>
                  <CheckCircle size={32} />
                </div>
                <h2 className={styles.stateTitle}>Check-In Successful!</h2>
                <p className={styles.stateDesc}>
                  Your attendance has been logged. Returning to WhatsApp in {returnCountdown} sec.
                </p>
                <div className={styles.employeeBadge} style={{ borderStyle: "solid" }}>
                  <span className={styles.empName}>{successData.record.employeeName}</span>
                  <span className={styles.empDetails}>
                    {successData.record.locationStatus || "In Office"} | Checked In: {new Date(successData.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {successData.record.distance !== undefined && (
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      AI Match Distance: {successData.record.distance.toFixed(4)} (Threshold: 0.45)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.errorState}>
                <div className={`${styles.stateIcon} ${styles.errorIconBg}`}>
                  <XCircle size={32} />
                </div>
                <h2 className={styles.stateTitle}>Check-In Failed</h2>
                <p className={styles.stateDesc}>
                  {successData.error}
                </p>
                
                {isMock && gpsLocation && (
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    onClick={setAsOfficeLocation}
                    disabled={settingConfig}
                    style={{ marginBottom: "12px", width: "100%", background: "linear-gradient(135deg, var(--color-secondary), #0891b2)" }}
                  >
                    {settingConfig ? "Updating Geofence..." : "Set as Office Location (Fix GPS Error)"}
                  </button>
                )}

                <button className="btn btn-outline" onClick={handleTryAgain} style={{ width: "100%" }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // D. Standard Check-In Form
  const isCameraStyle = capturedSelfie 
    ? styles.cameraSuccess 
    : (cameraError ? styles.cameraError : (cameraActive ? styles.cameraActive : ""));

  return (
    <div className={styles.container}>
      <div className={styles.glowBlob}></div>
      <div className={styles.glowBlobSecondary}></div>

      <div className={`${styles.card} glass-panel`}>
        {/* Header */}
        <div className={styles.logo}>
          <Sparkles className={styles.logoIcon} size={20} />
          <span className="glow-text-cyan">ATTENDANCE PORTAL</span>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Mark Attendance</h1>
          <p className={styles.subtitle}>Selfie & Location Verification Required</p>
        </div>

        {/* Employee Badge */}
        {employee && (
          <div className={styles.employeeBadge}>
            <span className={styles.empName}>{employee.fullName}</span>
            <span className={styles.empDetails}>{employee.role} • {employee.department}</span>
          </div>
        )}

        {/* Face AI Status / Loading Indicator */}
        {!modelsLoaded && !errorMsg && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--text-secondary)",
            marginBottom: "16px"
          }}>
            <Loader2 className="animate-spin" size={14} color="var(--color-secondary)" />
            <span>
              {modelsLoading ? "Initializing secure face matching..." : "Downloading Face AI models..."}
            </span>
          </div>
        )}

        {faceVerificationError && (
          <div style={{
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#f87171",
            marginBottom: "16px"
          }}>
            {faceVerificationError}
          </div>
        )}

        {/* Camera Selfie Container */}
        <div className={`${styles.cameraWrapper} ${isCameraStyle}`}>
          {capturedSelfie ? (
            <>
              <img src={capturedSelfie} alt="Captured Selfie" className={styles.capturedImage} />
              <button type="button" className={styles.reTakeBtn} onClick={retakeSelfie}>
                Retake Photo
              </button>
            </>
          ) : useFallbackCamera ? (
            // Native Mobile Camera Upload Fallback
            <div className={styles.cameraOverlay} onClick={() => document.getElementById("nativeCamera")?.click()}>
              <Camera size={40} color="var(--color-primary)" />
              <span className={styles.cameraOverlayText}>Tap to Capture Live Selfie</span>
              <input
                id="nativeCamera"
                type="file"
                accept="image/*"
                capture="user"
                className={styles.hiddenInput}
                onChange={handleFallbackCapture}
              />
            </div>
          ) : (
            // In-browser HTML5 Live Video
            <>
              <video ref={videoRef} className={styles.webcam} playsInline muted />
              {cameraActive ? (
                <div 
                  className={styles.reTakeBtn} 
                  style={{ bottom: "12px", background: "var(--color-primary)" }}
                  onClick={captureSelfie}
                >
                  Snap Photo
                </div>
              ) : (
                <div className={styles.cameraOverlay} onClick={initCamera}>
                  <Loader2 className="animate-spin" size={24} />
                  <span className={styles.cameraOverlayText}>Starting camera stream...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* GPS Geolocation Panel */}
        <div className={styles.gpsStatus}>
          <div 
            className={`${styles.gpsIndicatorDot} ${
              gpsLocation ? styles.gpsIndicatorDotActive : (gpsError ? styles.gpsIndicatorDotError : "")
            }`}
          />
          <div className={styles.gpsText}>
            <div className={styles.gpsTitle}>
              {gpsLocation ? "GPS Location Locked" : (gpsError ? "GPS Error" : "Fetching GPS Location...")}
            </div>
            <div className={styles.gpsCoords}>
              {gpsLocation ? (
                `Lat: ${gpsLocation.latitude.toFixed(5)}, Lng: ${gpsLocation.longitude.toFixed(5)} (±${Math.round(gpsLocation.accuracy)}m)`
              ) : (
                gpsError || "Locating coordinates..."
              )}
            </div>
          </div>
          {(gpsError || gpsLocation) && (
            <button type="button" className="btn btn-outline" style={{ padding: "6px" }} onClick={requestGPS} title="Retry Geolocation">
              <RefreshCw size={14} className={gpsLoading ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* Submit Action */}
        <button
          type="button"
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={!capturedSelfie || !gpsLocation || submitting || !modelsLoaded || modelsLoading}
          onClick={submitCheckIn}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={16} /> {verificationStatus || "Verifying..."}
            </>
          ) : modelsLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Loading Face AI...
            </>
          ) : !modelsLoaded ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Waiting for Face AI...
            </>
          ) : (
            <>
              <CheckCircle size={16} /> Submit Attendance
            </>
          )}
        </button>
      </div>
    </div>
  );
}
