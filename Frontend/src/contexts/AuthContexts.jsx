import { createContext, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

export const authContext = createContext({});

const client = axios.create({
      baseURL: "http://localhost:3000/api/v1/users",
})

export const AuthProvider = ({ children }) => {
      const [userData, setUserData] = useState({});


      const router = useNavigate();

      const handleRegister = async (name, username, password) => {
            try {
                  let request = await client.post("/register", {
                        name,
                        username,
                        password,
                  });
                  if (request.status === 201) {
                        return request.data.message;
                  }
            } catch (err) {
                  throw err;
            }
      }

      const handleLogin = async (username, password) => {
            try {

                  let request = await client.post("/login", {
                        username,
                        password,
                  });

                  console.log(request.data);
                  if (request.status === 200) {
                        localStorage.setItem("token", request.data.token);
                        document.cookie = `token=${request.data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
                        router("/");
                  }

            } catch (err) {
                  throw err;
            }
      }

      const data = {
            userData,
            setUserData,
            handleRegister,
            handleLogin,
      };

      return (
            <authContext.Provider value={data}>
                  {children}
            </authContext.Provider>
      );
}