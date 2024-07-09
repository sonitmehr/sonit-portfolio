import "./Contact.css";
import WorkExpCard from "./WorkExpCard";
import assets from '../../assets/assets'
function Contact() {
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
      <div className="contact">
        <h1 className="contact-page-title">
          Contact Me
        </h1>
        <span className="contact-desc">
          Please fill out the form below to discuss any work opportunities.
        </span>
        <form action="" className="contact-form">
          <input type="text" className="name" placeholder="Your Name" />
          <input type="email" className="email" placeholder="Your Email" />
          <textarea name="message" rows="5" placeholder="Your Message" className="msg"></textarea>
          <button type="submit" value="Send" className="submit-button">Submit</button>
          <div className="links">
            <img src={assets.facebook} alt="" className="link" />
            <img src={assets.twitter} alt="" className="link" />
            <img src={assets.instagram} alt="" className="link" />
            <img src={assets.youtube} alt="" className="link" />
          </div>
        </form>
      </div>
    </section>
  );
}

export default Contact;
