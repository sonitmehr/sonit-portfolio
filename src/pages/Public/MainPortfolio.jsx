import React from "react";
import Navbar from "../../components/Navbar/Navbar";
import Intro from "../../components/Intro/Intro";
import Skills from "../../components/Skills/Skills";
import Portfolio from "../../components/Portfolio/Portfolio";
import ExploreMore from "../../components/ExploreMore/ExploreMore";
import Contact from "../../components/Contact/Contact";
import Footer from "../../components/Footer/Footer";

const MainPortfolio = () => {
  return (
    <>
      <Navbar />
      <Intro />
      <Skills />
      <Portfolio />
      <ExploreMore />
      <Contact />
      <Footer />
    </>
  );
};

export default MainPortfolio;
