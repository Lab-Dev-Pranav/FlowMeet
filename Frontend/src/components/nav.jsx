import { useContext, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authContext } from '../contexts/AuthContexts.jsx'
import './nav.css'
import IconButton from '@mui/material/IconButton';
import ReStoreIcon from '@mui/icons-material/Restore';


function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { userData, handleLogout } = useContext(authContext)

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <Link to="/" onClick={closeMenu} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 className="logo">FlowMeet</h3>
      </Link>


      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        &#9776;
      </div>

      <ul className={`navlist ${menuOpen ? 'active' : ''}`}>


        {/* <li>Join as Guest</li> */}
        {
          
      }
        {
          location.pathname === "/home" && userData ? (
            <li>
              <Link
                to="/history"
                onClick={closeMenu}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconButton sx={{ color: "white" }}>
                  <ReStoreIcon />
                </IconButton>
                <span>History</span>
              </Link>
            </li>
          ):<></>

      }






        {!userData ? (
          <>
            <li>
              <Link
                to="/auth"
                onClick={closeMenu}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                Sign in
              </Link>
            </li>

            <li>
              <Link to="/auth" state={{ showRegister: true }} onClick={closeMenu}>
                <button className="btn">
                  <span>Register</span>
                </button>
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>{userData.username}</li>
            <li>
              <button className="btn" onClick={handleLogout}>
                <span>LogOut</span>
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}

export default Navbar
