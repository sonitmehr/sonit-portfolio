import React, { useState } from "react";
import "./Navbar.css";
import assets from "../../assets/assets";
import { Link } from "react-scroll";

function Navbar() {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <nav className="navbar">
      <Link
    activeClass="none"
        to="intro"
        spy={true}
        smooth={true}
        offset={-100}
        duration={500}
        // className="desktop-menu-item"
      >
        {/* <img src={assets.logo} alt="nope" className="logo" /> */}
        <span className="logo">Sonit</span>
      </Link>
      <div className="desktop-menu">
        <Link
          activeClass="active"
          to="intro"
          spy={true}
          smooth={true}
          offset={-100}
          duration={500}
          className="desktop-menu-item"
        >
          Home
        </Link>
        <Link
          activeClass="active"
          to="skills"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="desktop-menu-item"
        >
          About
        </Link>
        <Link
          activeClass="active"
          to="works"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="desktop-menu-item"
        >
          Portfolio
        </Link>
        <Link
          activeClass="active"
          to="contact-page"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="desktop-menu-item"
        >
          Work
        </Link>
      </div>
      <button
        className="desktop-menu-button"
        onClick={() => {
          document
            .getElementById("contact")
            .scrollIntoView({ behavior: "smooth" });
        }}
      >
        <img src={assets.contact} alt="" className="desktop-menu-img" />
        Contact Me
      </button>

      <img
        src={assets.menu}
        alt="Menu"
        className="burger-menu"
        onClick={() => setShowMenu(!showMenu)}
      />
      <div
        className="mobile-menu"
        style={{ display: showMenu ? "flex" : "none" }}
      >
        <Link
          activeClass="active"
          to="intro"
          spy={true}
          smooth={true}
          offset={-100}
          duration={500}
          className="mobile-menu-item"
          onClick={() => setShowMenu(false)}
        >
          Home
        </Link>
        <Link
          activeClass="active"
          to="skills"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="mobile-menu-item"
          onClick={() => setShowMenu(false)}
        >
          About
        </Link>
        <Link
          activeClass="active"
          to="works"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="mobile-menu-item"
          onClick={() => setShowMenu(false)}
        >
          Portfolio
        </Link>
        <Link
          activeClass="active"
          to="contact-page"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="mobile-menu-item"
          onClick={() => setShowMenu(false)}
        >
          Work
        </Link>
        <Link
          activeClass="active"
          to="contact"
          spy={true}
          smooth={true}
          offset={-50}
          duration={500}
          className="mobile-menu-item"
          onClick={() => setShowMenu(false)}
        >
          Contact
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
