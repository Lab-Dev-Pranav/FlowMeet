const rawEnvServerUrl = (import.meta.env.VITE_SERVER_URL || "").trim();
const defaultServerUrl = import.meta.env.PROD
  ? "https://flowmeet-be.onrender.com"
  : "http://localhost:3000";

const server = (rawEnvServerUrl || defaultServerUrl).replace(/\/+$/, "");
const apiBaseUrl = `${server}/api/v1/users`;

export { server, apiBaseUrl };
export default server;
