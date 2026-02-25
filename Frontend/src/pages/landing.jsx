import './landing.css'
import bgImage from '../assets/HOMEBG.jpg'
import mobile from '../assets/mobile.png'
import { Link } from 'react-router-dom'


function LandingPage() {
  return (


    <div
      className="landingPageContainer"
      style={{ backgroundImage: `url(${bgImage})` }}
    >

      <section className="mainContainer">
        <div className="mainContent">
          <h1>Connect by FlowMeet</h1>
          <p>Bridge the distance with your loved ones, anytime, anywhere.</p>

          <Link to="/home" className='' >
            <button className="btnb">
              <span>Start</span>
            </button>
          </Link>

        </div>

        <div className="homeImg">
          <img src={mobile} alt="Video call app preview" />
        </div>
      </section>
    </div>
  )
}

export default LandingPage
