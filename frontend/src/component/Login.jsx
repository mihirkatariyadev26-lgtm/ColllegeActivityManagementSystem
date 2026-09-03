import "./Login.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../authcontex";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [employeeName, setEmployeeName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(employeeName, password);
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-Page">
      <div id="LoginForm">
        <form id="form" onSubmit={handleLogin}>
          <p
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: "800",
            }}>
            Login
          </p>
          <p
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: "1.5rem",
              marginBottom: "2rem",
            }}>
            Activity Management Portal
          </p>

          <div className="inputGroup">
            <label
              htmlFor="employeeName"
              style={{
                alignContent: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: "500",
              }}>
              Employee Name :{" "}
            </label>
            <input
              id="employeeName"
              type="text"
              placeholder="Enter Employee Name"
              className="Input"
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
              required
            />
          </div>
          <div className="inputGroup">
            <label
              htmlFor="password"
              style={{
                alignContent: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: "500",
              }}>
              Password :{" "}
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              className="Input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && (
            <p role="alert" style={{ color: "#ff6b6b", textAlign: "center", fontWeight: "600" }}>
              {error}
            </p>
          )}
          <div id="btncontainer">
            <button className="LoginButton" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default Login;
