import * as React from 'react'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import CssBaseline from '@mui/material/CssBaseline'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Link from '@mui/material/Link'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import Snackbar from '@mui/material/Snackbar'

import { authContext } from '../contexts/AuthContexts.jsx';
import { useNavigate, useLocation} from 'react-router-dom';



const defaultTheme = createTheme()

export default function Authentication() {
  const navigate = useNavigate();
  const location = useLocation();


  const [username, setUserName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState();
  const [message, setMessage] = React.useState();
  const [formstate, setFormState] = React.useState(() => {
  if (location.state && location.state.showRegister) {
    return 1; 
  }
  return 0; 
});

  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(authContext);

  let handleAuth = async () => {
    try {
      if (formstate === 0) {
        // login logic
        let res = await handleLogin(username, password);

      }
      if (formstate === 1) {
        // register logic
        let res = await handleRegister(name, username, password);
        console.log(res);
        setMessage(res);
        setUserName("");
        setOpen(true);
        setError("");
        setFormState(0);
        setPassword("");
        // navigate("/"); // Redirect to home after registration
      }
    } catch (err) {
      // console.log(err);
      // return;
      let msg = err.response.data.message || "Registration failed";
      setError(msg);
    }
  }


  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />

        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <br />

          <div>
            <Button variant={formstate === 0 ? "contained" : ""} onClick={() => setFormState(0)}>
              Sign In
            </Button>
            <Button variant={formstate === 1 ? "contained" : ""} onClick={() => setFormState(1)}>
              Register
            </Button>
          </div>

          <Box component="form" sx={{ mt: 1 }}>

            {formstate == 1 ? <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            /> : <></>}


            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="User Name"
              name="username"
              value={username}
              autoFocus
              onChange={(e) => setUserName(e.target.value)}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              value={password}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <p style={{ color: 'red' }}>{error}</p>

            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleAuth}
            >
              {formstate === 0 ? "Sign In" : "Register"} 
            </Button>


          </Box>
        </Box>


      </Container>

      <Snackbar>
        open={open}
        autoHideDuration={4000}
        message={message}
      </Snackbar>


    </ThemeProvider>
  )
}
