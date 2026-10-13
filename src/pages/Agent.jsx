import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Agent() {
  const [running, setRunning] = useState(false);
  const [location, setLocation] = useState(null);
  const [battery, setBattery] = useState(null);
  const [status, setStatus] = useState("Not started");
  const watchId = useRef(null);
  const intervalId = useRef(null);
  const latestLocation = useRef(null);
  const navigate = useNavigate();

  async function readBattery() {
    if (!navigator.getBattery) {
      setBattery(null);
      return null;
    }

    try {
      const batteryManager = await navigator.getBattery();
      const value = Math.round(batteryManager.level * 100);
      setBattery(value);
      return value;
    } catch {
      return null;
    }
  }

  async function sendHeartbeat() {
    try {
      const currentBattery = await readBattery();
      const loc = latestLocation.current;

      await api.post("/device/heartbeat", {
        batteryLevel: currentBattery,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null
      });

      setStatus("Connected - heartbeat sent");
    } catch (err) {
      setStatus("Connection error");
    }
  }

  function start() {
    if (!navigator.geolocation) {
      setStatus("This browser does not support geolocation");
      return;
    }

    setStatus("Requesting location permission...");

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        latestLocation.current = loc;
        setLocation(loc);

        try {
          await api.post("/device/location", loc);
          setStatus("Location sent");
        } catch {
          setStatus("Could not send location");
        }
      },
      (error) => {
        setStatus(`Location permission/error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );

    readBattery();
    sendHeartbeat();
    intervalId.current = setInterval(sendHeartbeat, 15000);
    setRunning(true);
  }

  function stop() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }

    setRunning(false);
    setStatus("Monitoring stopped");
  }

  function disconnect() {
    stop();
    localStorage.removeItem("deviceToken");
    localStorage.removeItem("deviceId");
    navigate("/connect");
  }

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div className="child-page">
      <div className="child-card wide">
        <h1>FamilyShield Device Agent</h1>
        <p>
          Connected child: <strong>{localStorage.getItem("childName")}</strong>
        </p>

        <div className="notice">
          This page shares only the information shown below. Location requires
          browser permission. Camera and microphone are not accessed by this version.
        </div>

        <div className="data-grid">
          <div>
            <span>Agent status</span>
            <strong>{running ? "RUNNING" : "STOPPED"}</strong>
          </div>

          <div>
            <span>Battery</span>
            <strong>{battery === null ? "Not supported" : `${battery}%`}</strong>
          </div>

          <div>
            <span>Latitude</span>
            <strong>{location?.latitude ?? "Waiting"}</strong>
          </div>

          <div>
            <span>Longitude</span>
            <strong>{location?.longitude ?? "Waiting"}</strong>
          </div>
        </div>

        <p className="status">{status}</p>

        {!running ? (
          <button onClick={start}>Start Authorized Monitoring</button>
        ) : (
          <button className="stop" onClick={stop}>Stop Monitoring</button>
        )}

        <button className="secondary" onClick={disconnect}>
          Disconnect Device
        </button>
      </div>
    </div>
  );
}
