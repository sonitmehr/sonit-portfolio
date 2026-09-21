import React, { useState } from "react";
import "./Contact.css";
import WorkExpCard from "./WorkExpCard";
import assets from "../../assets/assets";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // 'idle' | 'sending' | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setStatus("error");
      setStatusMsg("Please fill in all fields before submitting.");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setStatus("error");
      setStatusMsg("Please provide a valid email address.");
      return;
    }

    setStatus("sending");
    setStatusMsg("");

    try {
      await addDoc(collection(db, "contactMessages"), {
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
        createdAt: serverTimestamp(),
      });

      setStatus("success");
      setStatusMsg("Thank you! Your message has been sent successfully.");
      setFormData({ name: "", email: "", message: "" });
    } catch (err) {
      console.error("Failed to send message to Firestore:", err);
      setStatus("error");
      setStatusMsg("Failed to send message. Please try again or reach out on social media.");
    }
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
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            className="name"
            placeholder="Your Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            maxLength={100}
            required
            disabled={status === "sending"}
          />
          <input
            type="email"
            className="email"
            placeholder="Your Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            maxLength={100}
            required
            disabled={status === "sending"}
          />
          <textarea
            name="message"
            rows="5"
            placeholder="Your Message"
            className="msg"
            value={formData.message}
            onChange={handleChange}
            maxLength={2000}
            required
            disabled={status === "sending"}
          ></textarea>

          {status === "success" && (
            <div className="contact-alert contact-alert-success" role="alert">
              <span>✓</span> {statusMsg}
            </div>
          )}

          {status === "error" && (
            <div className="contact-alert contact-alert-error" role="alert">
              <span>⚠</span> {statusMsg}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Submit"}
          </button>
          <div className="links">
            <a
              href="https://www.linkedin.com/in/sonit-mehrotra/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={assets.linkedin} alt="LinkedIn" className="link" />
            </a>
            <a
              href="https://x.com/sonitmehrotra"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={assets.twitter} alt="Twitter" className="link" />
            </a>
            <a
              href="https://www.instagram.com/sonitmehrotra/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={assets.instagram} alt="Instagram" className="link" />
            </a>
            <a
              href="https://github.com/sonitmehr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={assets.github} alt="GitHub" className="link" />
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Contact;
