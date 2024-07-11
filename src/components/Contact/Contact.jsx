import "./Contact.css";
import WorkExpCard from "./WorkExpCard";
import assets from "../../assets/assets";
import emailjs from "@emailjs/browser";
import { useRef } from "react";
function Contact() {
  const form = useRef();
  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm("service_3grwi4a", "template_iu2049j", form.current, {
        publicKey: "F9x1MdprqbT9t8kDA",
      })
      .then(
        () => {
          console.log("SUCCESS!");
          alert("Message Sent Successfully");
        },
        (error) => {
          console.log("FAILED...", error.text);
          alert("Message Failed to send", error.text);
        }
      );
    e.target.reset();
  };
  return (
    <section id="contact-page">
      <div className="work-exp">
        <h1 className="work-exp-title">Work Experience</h1>
        <p className="work-exp-desc">
          I have had the opportunity to work with a diverse group of companies.
        </p>
      </div>
      <div className="work-exp-cards">
        <WorkExpCard
          source="https://play-lh.googleusercontent.com/CckbvnSKH4pEaS2MdMgT2_Uhyr3OjniAlLkb8yVlGPr1troAooAAoW6x01ZO5qLgmJQ=w480-h960-rw"
          company="CareEco Technologies"
          workPosition="Flutter Developer Internship | 6 months"
          redirect="https://play.google.com/store/apps/details?id=in.curepoint.customer"
        />
      </div>
      <div id="contact">
        <h1 className="contact-page-title">Contact Me</h1>
        <span className="contact-desc">
          Please fill out the form below to discuss any work opportunities.
        </span>
        <form
          ref={form}
          action=""
          className="contact-form"
          onSubmit={sendEmail}
        >
          <input
            type="text"
            className="name"
            placeholder="Your Name"
            name="your_name"
          />
          <input
            type="email"
            className="email"
            placeholder="Your Email"
            name="your_email"
          />
          <textarea
            name="message"
            rows="5"
            placeholder="Your Message"
            className="msg"
          ></textarea>
          <button type="submit" value="Send" className="submit-button">
            Submit
          </button>
          <div className="links">
            <a
              href="https://www.linkedin.com/in/sonit-mehrotra/"
              target="_blank"
            >
              <img src={assets.linkedin} alt="" className="link" />
            </a>
            <a href="https://x.com/sonitmehrotra" target="_blank">
              <img src={assets.twitter} alt="" className="link" />
            </a>
            <a href="https://www.instagram.com/sonitmehrotra/" target="_blank">
              <img src={assets.instagram} alt="" className="link" />
            </a>
            <a href="https://github.com/sonitmehr" target="_blank">
              <img src={assets.github} alt="" className="link" />
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Contact;
