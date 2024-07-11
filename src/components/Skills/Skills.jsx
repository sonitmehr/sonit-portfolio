import React from 'react';
import './Skills.css';
import assets from '../../assets/assets';

function Skills() {
  return (
    <section id="skills">
      <span className="skill-title">What I do</span>
      <span className="skill-description">
        With a strong foundation in Dart and extensive experience with
        Flutter&apos;s versatile framework, I have successfully delivered
        innovative solutions tailored to meet diverse business needs. My
        portfolio showcases a range of projects, including complex inventory
        management systems and feature-rich social media platforms,
        demonstrating my ability to bring ideas to life through clean code,
        intuitive UI/UX design, and robust backend integration.{" "}
      </span>
      <div className="skill-bars">
        <div className="skill-bar">
          <img src={assets.uiDesign} alt="" className="skill-bar-img" />
          <div className="skill-bar-text">
            <h2>UI/UX</h2>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Recusandae necessitatibus debitis a consequatur dolore ab dolores.
            </p>
          </div>
        </div>
        <div className="skill-bar">
          <img src={assets.webDesign} alt="" className="skill-bar-img" />
          <div className="skill-bar-text">
            <h2>Web Design</h2>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Recusandae necessitatibus debitis a consequatur dolore ab dolores.
            </p>
          </div>
        </div>
        <div className="skill-bar">
          <img src={assets.appDesign} alt="" className="skill-bar-img" />
          <div className="skill-bar-text">
            <h2>App Design</h2>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Recusandae necessitatibus debitis a consequatur dolore ab dolores.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Skills