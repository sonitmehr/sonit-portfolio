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
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam, <br/>
          dignissimos officiis voluptates dolor atque culpa ipsum?{" "}
        </p>
        <Link>
          <button className="intro-btn">
            <img src={assets.hireMe} alt="" />
            Hire Me
          </button>
        </Link>
      </div>
      <img src={assets.person} alt="" className="intro-image" />
    </section>
  );
}

export default Intro;
