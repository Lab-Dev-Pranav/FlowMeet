import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { apiBaseUrl } from "../environment"

export const authContext = createContext({});

const client = axios.create({
  baseURL: apiBaseUrl,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const storedUser = localStorage.getItem("userData");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const router = useNavigate();

  useEffect(() => {
    if (userData) {
      window.userdata = userData;
      return;
    }

    delete window.userdata;
  }, [userData]);

  const handleRegister = async (name, username, password) => {
    try {
      const request = await client.post("/register", {
        name,
        username,
        password,
      });

      if (request.status === 200 || request.status === 201) {
        return request.data.message;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const request = await client.post("/login", {
        username,
        password,
      });

      if (request.status === 200) {
        const token = request.data.token;
        const loggedInUser = request.data.user || { username };

        localStorage.setItem("token", token);
        localStorage.setItem("userData", JSON.stringify(loggedInUser));
        setUserData(loggedInUser);
        document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        router("/");
      }

      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await client.post("/logout", { token });
      }
    } catch (err) {
      console.error("Logout request failed", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      setUserData(null);
      document.cookie = "token=; path=/; max-age=0";
      router("/");
    }
  };


  const addUserHistory = async (meetingCode) => {
    const token = localStorage.getItem("token");

    if (!token || !meetingCode) {
      return null;
    }

    try{
        let req = await client.post("/addactivity", {
          token,
          meetingCode,
        });
        return req;
    }catch(err){
      console.log(err);
      return null;
    }

  }
       




  const getUserHistory = async () => {
    try{
        let req = await client.get("/getactivity", {
          params: {
            token: localStorage.getItem("token"),
          },
        });
        return req.data;      
        
    }catch(err){
      console.log(err);
    }
  }






  const data = {
    userData,
    setUserData,
    getUserHistory,
    addUserHistory,
    handleRegister,
    handleLogin,
    handleLogout,
  };

  return <authContext.Provider value={data}>{children}</authContext.Provider>;
};

