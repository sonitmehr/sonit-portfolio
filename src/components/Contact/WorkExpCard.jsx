import React from "react";
import "./WorkExpCard.css";

function WorkExpCard(props) {
  return (
    <a href={props.redirect} target="_blank">
      <div className="work-exp-card">
        <img src={props.source} alt="" className="work-exp-img" />
        <h2 className="company-name">{props.company}</h2>
        <span className="work-postion">{props.workPosition}</span>
      </div>
    </a>
  );
}

export default WorkExpCard;
