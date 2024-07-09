import React from 'react';
import './Skills.css';
import assets from '../../assets/assets';

function Skills() {
  return (
    <section id ='skills'>
        <span className="skill-title">
            What I do
        </span>
        <span className="skill-description">
           Lorem ipsum dolor sit, amet consectetur adipisicing elit. Magni aliquam recusandae expedita corporis, aliquid atque excepturi. Saepe magni animi assumenda incidunt iste, earum voluptatibus neque, doloremque, accusantium a dicta nisi. Temporibus, nobis. </span>
        <div className="skill-bars">
            <div className="skill-bar">
                <img src={assets.uiDesign} alt="" className="skill-bar-img" />
                <div className="skill-bar-text">
                    <h2>UI/UX</h2>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae necessitatibus debitis a consequatur dolore ab dolores.</p>
                </div>
            </div>
            <div className="skill-bar">
                <img src={assets.webDesign} alt="" className="skill-bar-img" />
                <div className="skill-bar-text">
                    <h2>Web Design</h2>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae necessitatibus debitis a consequatur dolore ab dolores.</p>
                </div>
            </div>
            <div className="skill-bar">
                <img src={assets.appDesign} alt="" className="skill-bar-img" />
                <div className="skill-bar-text">
                    <h2>App Design</h2>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae necessitatibus debitis a consequatur dolore ab dolores.</p>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Skills