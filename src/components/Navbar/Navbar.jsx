import React from 'react';
import './Navbar.css';
import assets from '../../assets/assets';
import {Link} from 'react-scroll';

function Navbar() {
  return (
    <nav className='navbar'>
        <img src={assets.logo} alt="nope" className='logo' />
        <div className="desktop-menu">
                <Link className='desktop-menu-item'>Home</Link>
                <Link className='desktop-menu-item'>About</Link>
                <Link className='desktop-menu-item'>Portfolio</Link>
                <Link className='desktop-menu-item'>Clients</Link>
        </div>
        <button className="desktop-menu-button">
            <img src={assets.contact} alt="" className="desktop-menu-img" />Contact Me
        </button>

    </nav>
  )
}

export default Navbar