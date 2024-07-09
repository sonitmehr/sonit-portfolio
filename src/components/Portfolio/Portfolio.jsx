import React from "react";
import assets from "../../assets/assets";
import './Portfolio.css';

function Portfolio() {
  return (
    <section id="works">
      <h2 className="works-title">My Portfolio</h2>
      <span className="works-desc">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate earum
        labore ducimus inventore pariatur incidunt ratione.
      </span>
      <div className="works-imgs">
        <img src={assets.portfolio1} alt="" className="works-img" />
        <img src={assets.portfolio1} alt="" className="works-img" />
        <img src={assets.portfolio1} alt="" className="works-img" />
        <img src={assets.portfolio1} alt="" className="works-img" />
        <img src={assets.portfolio1} alt="" className="works-img" />
        <img src={assets.portfolio1} alt="" className="works-img" />
      </div>
      <button className="works-btn">
        See More
      </button>
    </section>
  );
}

export default Portfolio;
