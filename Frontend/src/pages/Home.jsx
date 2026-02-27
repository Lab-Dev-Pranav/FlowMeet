import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WithAuth from "../utils/withAuth.jsx";
import "./Home.css";

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { authContext } from "../contexts/AuthContexts.jsx";


function Home() {
      let navigate = useNavigate();
      const [mettingCode, setMettingCode] = useState("");

      const {addUserHistory} = React.useContext(authContext);


      let handleJoinVideoCall = async () => {
            const meetingCode = mettingCode.trim();
            if (!meetingCode) return;
            await addUserHistory(meetingCode);
            navigate(`/${encodeURIComponent(meetingCode)}`);
      };

      return (
           <>
                  <div className="meetContainer">
                              <div className="leftPannel">
                                    <div className="leftPannelInner">
                                          <h2>
                                                Providing Quility Vedio Just Like Quality Education
                                          </h2>
                                          <div className="lpbox">
                                                
                                                <TextField onChange={(e)=>setMettingCode(e.target.value)} id="outLined" placeholder="Metting Id" className="leftPannelInput"></TextField>
                                                <Button onClick={handleJoinVideoCall}>Join</Button>
                                          </div>
                                    </div>
                              </div> 
                               <div className="righePannel">
                                    <div className="righePannelInner">
                                          <img src="./homeimg.png" alt="/Home Hero Img" />
                                    </div>
                               </div>
                  </div>
           </>
      )
}

export default WithAuth(Home);
