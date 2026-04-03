(() => {
  "use strict";

  // ========================================
  // Particle canvas background
  // ========================================
  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let particles = [];
  let mouse = { x: -1000, y: -1000 };
  const PARTICLE_COUNT = prefersReducedMotion ? 0 : (isMobile ? 34 : 80);
  const CONNECT_DIST = isMobile ? 100 : 140;
  const MOUSE_DIST = isMobile ? 120 : 200;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
      });
    }
  }

  function drawParticles() {
    if (PARTICLE_COUNT === 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(139, 131, 255, 0.5)";
      ctx.fill();

      // Subtle glow around each particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 91, 255, 0.04)";
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(99, 91, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Mouse interaction
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

      if (mDist < MOUSE_DIST) {
        const alpha = (1 - mDist / MOUSE_DIST) * 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Subtle push
        const force = (MOUSE_DIST - mDist) / MOUSE_DIST * 0.02;
        p.vx += mdx * force;
        p.vy += mdy * force;

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;
      }
    }

    requestAnimationFrame(drawParticles);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    createParticles();
  });

  document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  document.addEventListener("touchmove", (e) => {
    if (!e.touches || e.touches.length === 0) return;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
  }, { passive: true });

  resizeCanvas();
  createParticles();
  drawParticles();

  // ========================================
  // Typing effect
  // ========================================
  const phrases = [
    "automation systems.",
    "full-stack apps.",
    "AI-powered tools.",
    "workflow pipelines.",
    "things people use.",
    "Roblox games.",
    "client websites.",
  ];

  const typedEl = document.getElementById("typedText");
  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function typeLoop() {
    const current = phrases[phraseIdx];

    if (!isDeleting) {
      typedEl.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        isDeleting = true;
        setTimeout(typeLoop, 2000);
        return;
      }
      setTimeout(typeLoop, 60 + Math.random() * 40);
    } else {
      typedEl.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(typeLoop, 400);
        return;
      }
      setTimeout(typeLoop, 30);
    }
  }

  setTimeout(typeLoop, 1200);

  // ========================================
  // Nav scroll
  // ========================================
  const nav = document.getElementById("nav");
  const sections = document.querySelectorAll(".section, .hero");
  const navLinks = document.querySelectorAll(".nav-links a");

  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 40);

    let current = "";
    sections.forEach((s) => {
      if (window.scrollY >= s.offsetTop - 120) {
        current = s.id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ========================================
  // Mobile menu
  // ========================================
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  navToggle.addEventListener("click", () => {
    navToggle.classList.toggle("open");
    mobileMenu.classList.toggle("open");
    document.body.style.overflow = mobileMenu.classList.contains("open") ? "hidden" : "";
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.classList.remove("open");
      mobileMenu.classList.remove("open");
      document.body.style.overflow = "";
    });
  });

  // ========================================
  // Scroll reveal
  // ========================================
  const revealEls = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  // Stagger groups
  const groups = [
    { parent: ".projects-grid", child: ".project-card" },
    { parent: ".skills-grid", child: ".skill-group" },
    { parent: ".about-cards", child: ".info-card" },
    { parent: ".contact-grid", child: ".contact-item" },
  ];

  groups.forEach(({ parent, child }) => {
    const container = document.querySelector(parent);
    if (!container) return;

    const groupObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const items = container.querySelectorAll(child);
            items.forEach((item, i) => {
              const revealTarget = item.classList.contains("reveal") ? item : item.querySelector(".reveal");
              if (revealTarget) {
                revealTarget.style.transitionDelay = i * 0.08 + "s";
                revealTarget.classList.add("visible");
              } else {
                item.style.transitionDelay = i * 0.08 + "s";
                item.style.opacity = "1";
                item.style.transform = "translateY(0)";
              }
            });
            groupObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    groupObs.observe(container);
  });

  // ========================================
  // Smooth scroll
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });

  // ========================================
  // Project card glow follow
  // ========================================
  if (!isMobile) {
    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", x + "px");
        card.style.setProperty("--mouse-y", y + "px");
      });
    });
  }

  // ========================================
  // 3D tilt on featured project
  // ========================================
  const featured = document.querySelector(".project-featured");
  if (featured && !isMobile) {
    featured.addEventListener("mousemove", (e) => {
      const rect = featured.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      featured.style.transform = `perspective(1200px) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`;
    });

    featured.addEventListener("mouseleave", () => {
      featured.style.transform = "";
      featured.style.transition = "transform 0.5s ease";
      setTimeout(() => { featured.style.transition = ""; }, 500);
    });
  }
})();
