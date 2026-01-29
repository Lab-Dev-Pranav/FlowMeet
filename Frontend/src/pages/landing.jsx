import { useState } from 'react'
import './landing.css'
import bgImage from '../assets/HOMEBG.jpg'
import mobile from '../assets/mobile.png'
import { Link } from 'react-router-dom'


function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="landingPageContainer"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <nav className="navbar">
        <h3 className="logo">FlowMeet</h3>

        <div
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </div>

        <ul className={`navlist ${menuOpen ? 'active' : ''}`}>
          <li>Join as Guest</li>
          <Link to="/auth" style={{ textDecoration: 'none', color: 'inherit' }}>
            <li>sign in</li>
          </Link>
         
          <li>

            <Link to="/auth"  state={{ showRegister: true }}>
              <button className="btn">
                <span>Register</span>
              </button>
            </Link>

          </li>
        </ul>
      </nav>

      <section className="mainContainer">
        <div className="mainContent">
          <h1>Connect by FlowMeet</h1>
          <p>Bridge the distance with your loved ones, anytime, anywhere.</p>


          <button className="btnb">
            <span>Get Started</span>
          </button>
        </div>

        <div className="homeImg">
          <img src={mobile} alt="Video call app preview" />
        </div>
      </section>
    </div>
  )
}

export default LandingPage
