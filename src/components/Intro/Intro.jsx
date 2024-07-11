import React from "react";

import "./Intro.css";
import assets from "../../assets/assets";
import { Link } from "react-scroll";
function Intro() {
  return (
    <section id="intro">
      <div className="intro-content">
        <span className="hello">Hello,</span>
        <span className="intro-text">
          I&apos;m <span className="intro-name">Sonit </span>
          <br />
          Flutter Developer
        </span>
        <p className="intro-para">
          I am a passionate and skilled Flutter developer,
           with experience in creating cross-platform mobile and 
          desktop applications that are both aesthetically pleasing and highly
          functional.
        </p>
        <Link>
          <button
            className="intro-btn"
            onClick={() => {
              document
                .getElementById("contact")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            <img src={assets.hireMe} alt="" />
            Hire Me
          </button>
        </Link>
      </div>
      {/* <img
        src={
         "../../assets/robot.png" }
        alt=""
        className="intro-image"
      /> */}
    </section>
  );
}

export default Intro;
