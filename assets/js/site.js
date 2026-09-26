/* =========================================================================
   Les Terrasses de Merlue — comportements

   Tout est facultatif : sans JavaScript, la page reste entièrement lisible
   et le formulaire reste envoyable. Le script n'ajoute que du confort.
   ========================================================================= */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------ rideau d'intro */
  /* Le départ du rideau est joué par le CSS — voir la section 5b de la
     feuille de style. Ce bloc ne fait que deux choses : empêcher de faire
     défiler la page pendant qu'il est là, et retirer le calque une fois
     sorti. Si ce script ne s'exécute jamais, le rideau s'en va quand même.

     Cas de l'ancre : un rafraîchissement en cours de page porte un « #section »
     dans l'adresse. Le verrou de défilement annule le saut du navigateur, on
     repositionne donc la page une fois le rideau retiré. */
  var curtain = $(".curtain");
  var curtainGone = !curtain;

  function whenCurtainGone(fn) {
    if (curtainGone) fn();
    else document.addEventListener("merlue:rideau-parti", fn, { once: true });
  }

  if (curtain) {
    if (reduced) {
      curtain.parentNode.removeChild(curtain);
      curtain = null;
      curtainGone = true;
    } else {
      document.body.classList.add("is-curtained");

      var dropCurtain = function () {
        if (!curtain || !curtain.parentNode) return;
        curtain.parentNode.removeChild(curtain);
        curtain = null;
        document.body.classList.remove("is-curtained");

        var id = location.hash.slice(1);
        var target = id && document.getElementById(id);
        if (target) target.scrollIntoView({ block: "start" });

        // Le diaporama du bandeau n'a aucune raison de tourner derrière le
        // rideau : il attend ce signal pour lancer son premier décompte.
        curtainGone = true;
        document.dispatchEvent(new CustomEvent("merlue:rideau-parti"));
      };

      curtain.addEventListener("animationend", function (e) {
        if (e.animationName === "curtain-leave") dropCurtain();
      });

      // Filet : animation jamais jouée (onglet en arrière-plan au chargement,
      // retour arrière depuis le cache du navigateur).
      setTimeout(dropCurtain, 3600);
      addEventListener("pageshow", function (e) { if (e.persisted) dropCurtain(); });
    }
  }

  /* ------------------------------------------------ bandeau : le relais */
  /* Trois vues empilées, trois secondes chacune, en fondu. Le fondu lui-même
     est dans la feuille de style : ici on ne fait que déplacer la classe.

     Deux précautions : on ne démarre qu'une fois le rideau parti, et on met
     en pause quand l'onglet passe en arrière-plan — un fondu que personne ne
     regarde ne fait que réveiller le processeur. */
  var slides = $$(".hero-media picture");
  if (slides.length > 1 && !reduced) {
    var slide = 0, timer = null;

    var nextSlide = function () {
      slides[slide].classList.remove("is-on");
      slide = (slide + 1) % slides.length;
      slides[slide].classList.add("is-on");
    };
    var runSlides = function () {
      if (!timer) timer = setInterval(nextSlide, 3000);
    };
    var haltSlides = function () {
      clearInterval(timer);
      timer = null;
    };

    whenCurtainGone(runSlides);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) haltSlides();
      else whenCurtainGone(runSlides);
    });
  }

  /* ------------------------------------------------ en-tête collant */
  var masthead = $(".masthead");
  if (masthead) {
    var stuck = false;
    var onScroll = function () {
      var should = window.scrollY > 12;
      if (should !== stuck) {
        stuck = should;
        masthead.classList.toggle("is-stuck", stuck);
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* --------------------------------- barre d'action, après le bandeau */
  /* Au téléphone, « Appeler » et « Réserver » ne paraissent qu'une fois le
     bandeau passé : posée dessus, la barre couvrait le bas de la photographie
     et doublait les deux boutons qui s'y trouvent déjà.

     Le seuil est la hauteur du bandeau moins un peu : on la relit à chaque
     redimensionnement, la barre d'adresse du téléphone la fait varier. Pas
     d'IntersectionObserver ici — l'écouteur de défilement est déjà posé
     au-dessus pour l'en-tête, autant s'en servir. */
  var dock = $(".dock");
  var heroBloc = $(".hero");
  if (dock && heroBloc) {
    var dockOn = false;
    var seuil = 0;
    var mesurer = function () { seuil = Math.max(120, heroBloc.offsetHeight - 120); };
    var peindreDock = function () {
      var should = window.scrollY > seuil;
      if (should !== dockOn) {
        dockOn = should;
        dock.classList.toggle("is-on", dockOn);
      }
    };
    mesurer();
    addEventListener("scroll", peindreDock, { passive: true });
    addEventListener("resize", function () { mesurer(); peindreDock(); }, { passive: true });
    addEventListener("load", function () { mesurer(); peindreDock(); });
    peindreDock();
  }

  /* ------------------------------------------------- menu mobile */
  var burger = $(".burger");
  var nav = $(".nav");
  var scrim = $(".scrim");

  function setMenu(open) {
    if (!burger || !nav) return;
    burger.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    /* Le panneau du menu est un enfant de l'en-tête, et l'en-tête collé porte
       un backdrop-filter. Un élément filtré devient le bloc conteneur de ses
       descendants en position fixe : le panneau, posé en inset: 0, remplissait
       alors l'EN-TÊTE — 144 px de haut — au lieu de l'écran. Cette classe
       éteint le filtre le temps que le menu est ouvert ; il n'a de toute façon
       plus rien à flouter, le panneau blanc étant devant. */
    document.body.classList.toggle("menu-ouvert", open);
    if (scrim) scrim.classList.toggle("is-on", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = nav.querySelector("a");
      if (first) first.focus();
    }
  }

  if (burger) {
    burger.addEventListener("click", function () {
      setMenu(burger.getAttribute("aria-expanded") !== "true");
    });
  }
  if (scrim) scrim.addEventListener("click", function () { setMenu(false); });
  $$(".nav a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });

  /* --------------------------------------------- révélation au défilement */
  /* Un balayage, pas un IntersectionObserver : celui-ci laisse des blocs
     vides quand on descend vite, en manquant les éléments franchis entre
     deux images. Ici, tout ce qui est passé sous le seuil est révélé, quelle
     que soit la vitesse de défilement. */
  var pending = $$(".reveal");
  if (pending.length) {
    if (reduced) {
      pending.forEach(function (el) { el.classList.add("is-in"); });
      pending = [];
    } else {
      var ticking = false;

      var sweep = function () {
        ticking = false;
        var limit = window.innerHeight * 0.92;
        pending = pending.filter(function (el) {
          if (el.getBoundingClientRect().top < limit) {
            el.classList.add("is-in");
            return false;
          }
          return true;
        });
        if (!pending.length) {
          removeEventListener("scroll", request);
          removeEventListener("resize", request);
        }
      };

      var request = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(sweep); }
      };

      addEventListener("scroll", request, { passive: true });
      addEventListener("resize", request, { passive: true });
      sweep();
    }
  }


  /* ------------------------------------------- les chiffres s'égrènent */
  /* Chaque nombre monte de zéro à sa valeur quand il arrive à l'écran.
     Sans JavaScript, ou en mouvement réduit, la valeur est posée telle
     quelle : le repère reste lisible dans tous les cas. */
  var counters = $$("[data-count]");
  if (counters.length) {
    var settle = function (el) {
      el.textContent = el.getAttribute("data-count");
    };

    if (reduced) {
      counters.forEach(settle);
    } else {
      var run = function (el) {
        var target = parseInt(el.getAttribute("data-count"), 10);
        if (isNaN(target)) { settle(el); return; }
        var span = 1100 + Math.min(target, 200) * 3;
        var start = null;

        var step = function (now) {
          if (start === null) start = now;
          var k = Math.min((now - start) / span, 1);
          // départ rapide puis décélération, pour que le chiffre « se pose »
          var eased = 1 - Math.pow(1 - k, 3);
          el.textContent = String(Math.round(target * eased));
          if (k < 1) requestAnimationFrame(step);
          else settle(el);
        };
        requestAnimationFrame(step);
      };

      var pendingCounts = counters.slice();
      var sweepCounts = function () {
        var limit = window.innerHeight * 0.9;
        pendingCounts = pendingCounts.filter(function (el) {
          var box = el.getBoundingClientRect();
          if (box.top < limit && box.bottom > 0) { run(el); return false; }
          return true;
        });
        if (!pendingCounts.length) removeEventListener("scroll", askCounts);
      };
      var countTick = false;
      var askCounts = function () {
        if (!countTick) { countTick = true; requestAnimationFrame(function () {
          countTick = false; sweepCounts();
        }); }
      };
      addEventListener("scroll", askCounts, { passive: true });
      sweepCounts();
    }
  }

  /* ---------------------------------------------------------- lightbox */
  var lb = $(".lightbox");
  if (lb) {
    var lbImg = $("img", lb);
    var lbCap = $("figcaption", lb);
    var items = [];
    var index = 0;
    var opener = null;

    function show(i) {
      index = (i + items.length) % items.length;
      var it = items[index];
      lbImg.src = it.full;
      lbImg.alt = it.alt;
      lbImg.hidden = false;
      lbCap.textContent = it.alt + "  ·  " + (index + 1) + " / " + items.length;
    }

    function open(i, from) {
      opener = from || null;
      show(i);
      lb.setAttribute("open", "");
      document.body.style.overflow = "hidden";
      var close = $(".lb-close", lb);
      if (close) close.focus();
    }

    function close() {
      lb.removeAttribute("open");
      document.body.style.overflow = "";
      lbImg.removeAttribute("src");
      lbImg.hidden = true;
      if (opener) opener.focus();
    }

    /* La visionneuse sert deux choses : la mosaïque de la galerie, qui forme
       un seul lot, et les vignettes de « La maison » et des extérieurs, qui
       ont chacune le leur. Le lot courant remplace `items` à l'ouverture.

       Le sélecteur visait « .gallery button » alors que le balisage dit
       « .mosaic » : la galerie ne s'agrandissait donc pas du tout, et ce
       depuis le premier jour. Corrigé ici. */
    function ouvrir(liste, i, depuis) {
      if (!liste || !liste.length) return;
      items = liste;
      open(i, depuis);
    }

    var mosaique = $$(".mosaic button");
    var lotGalerie = mosaique.map(function (btn) {
      return { full: btn.getAttribute("data-full"), alt: btn.getAttribute("data-alt") || "" };
    });
    mosaique.forEach(function (btn, i) {
      btn.addEventListener("click", function () { ouvrir(lotGalerie, i, btn); });
    });

    /* Les autres lots voyagent en JSON plutôt qu'en balisage : leurs vues ne
       sont pas des vignettes, elles n'ont aucune raison d'être dans le DOM ni
       d'être chargées avant qu'on les demande. */
    var lots = {};
    var ilot = $("[data-lots]");
    if (ilot) { try { lots = JSON.parse(ilot.textContent) || {}; } catch (e) { lots = {}; } }

    $$("[data-lot]").forEach(function (prise) {
      prise.addEventListener("click", function () {
        var brut = lots[prise.getAttribute("data-lot")];
        if (!brut) return;
        ouvrir(brut.map(function (x) { return { full: x.u, alt: x.a }; }), 0, prise);
      });
    });

    var closeBtn = $(".lb-close", lb);
    var prevBtn = $(".lb-prev", lb);
    var nextBtn = $(".lb-next", lb);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (prevBtn) prevBtn.addEventListener("click", function () { show(index - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { show(index + 1); });

    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

    addEventListener("keydown", function (e) {
      if (!lb.hasAttribute("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
      else if (e.key === "Tab") {
        // le focus reste dans la visionneuse
        var f = $$("button", lb);
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }


  /* --------------------------------------------- carrousels des chambres */
  /* Le défilement reste celui du navigateur : on ne fait qu'ajouter les
     boutons, les points et le compteur par-dessus. */
  $$("[data-carousel]").forEach(function (box) {
    var track = $(".carousel-track", box);
    var slides = $$(".carousel-slide", track);
    if (!track || slides.length < 2) return;

    var prev = $(".carousel-prev", box);
    var next = $(".carousel-next", box);
    var count = $(".carousel-count", box);
    var dots = $$(".carousel-dots i", box);

    var current = function () {
      // Dans une fiche fermée, la pellicule a une largeur nulle : sans ce
      // garde-fou la division rendait NaN, et le compteur affichait « NaN ».
      var w = track.clientWidth;
      return w ? Math.round(track.scrollLeft / w) : 0;
    };

    // Cible en cours : sans elle, deux clics rapprochés repartiraient tous
    // deux de la même position, le défilement doux n'étant pas terminé.
    var target = null;

    var paint = function (i) {
      i = Math.max(0, Math.min(i, slides.length - 1));
      if (count) count.textContent = (i + 1) + " / " + slides.length;
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
    };

    var go = function (step) {
      var from = target === null ? current() : target;
      target = Math.max(0, Math.min(from + step, slides.length - 1));
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
      paint(target);
    };

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });

    var settle;
    track.addEventListener("scroll", function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        target = null;          // le défilement est fini, on relâche la cible
        paint(current());
      }, 130);
      if (target === null) paint(current());
    }, { passive: true });

    // les flèches du clavier font défiler quand la pellicule a le focus
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    });

    // une largeur de fenêtre qui change invalide la position calculée
    addEventListener("resize", function () { target = null; paint(current()); }, { passive: true });

    paint(0);
  });


  /* ------------------------------------------- ponts roulants et fiches */
  /* Un seul pilote pour trois rangées : le pont des chambres, le carrousel
     des extérieurs et celui des activités. Toutes trois sont des boîtes qui
     défilent en x avec accroche ; seul le nombre de colonnes visibles change,
     et il se mesure au lieu de se déclarer.

     Sur grand écran, extérieurs et activités ne défilent pas du tout — la
     feuille de style leur rend leur grille et éteint les flèches. Le pilote
     tourne quand même : il ne trouve alors rien à faire, scrollWidth valant
     clientWidth, et les deux flèches restent éteintes. */
  function pont(deck, deckPrev, deckNext) {
    if (!deck) return;

    /* Le pas d'une colonne, mesuré sur les deux premières cellules : il suit
       la feuille de style sans la répéter ici. */
    var deckPas = function () {
      var a = deck.children[0], b = deck.children[1];
      var pas = a && b ? Math.abs(b.offsetLeft - a.offsetLeft) : 0;
      return pas || deck.clientWidth;
    };
    /* Une page vaut le nombre entier de colonnes visibles : trois sur grand
       écran, une au doigt. Caler le défilement sur ce multiple évite le clic
       qui n'avance que de quelques pixels en fin de course. */
    var deckPage = function () {
      var pas = deckPas();
      return pas * Math.max(1, Math.round(deck.clientWidth / pas));
    };
    var deckMax = function () { return deck.scrollWidth - deck.clientWidth; };

    var deckPaint = function () {
      var max = deckMax();
      if (deckPrev) deckPrev.disabled = deck.scrollLeft <= 4;
      if (deckNext) deckNext.disabled = deck.scrollLeft >= max - 4;
    };
    var deckGo = function (sens) {
      var page = deckPage();
      var cible = (Math.round(deck.scrollLeft / page) + sens) * page;
      deck.scrollTo({
        left: Math.max(0, Math.min(cible, deckMax())),
        behavior: "smooth"
      });
    };

    if (deckPrev) deckPrev.addEventListener("click", function () { deckGo(-1); });
    if (deckNext) deckNext.addEventListener("click", function () { deckGo(1); });
    deck.addEventListener("scroll", deckPaint, { passive: true });
    addEventListener("resize", deckPaint, { passive: true });
    /* Les vues arrivent après le script : on repasse une fois la mise en page
       posée, sinon une flèche pourrait rester éteinte sans raison. */
    addEventListener("load", deckPaint);
    deckPaint();
  }

  pont($("[data-rooms-track]"), $("[data-rooms-prev]"), $("[data-rooms-next]"));
  $$("[data-piste]").forEach(function (voie) {
    var cadre = voie.parentElement;
    pont(voie, $("[data-piste-prev]", cadre), $("[data-piste-next]", cadre));
  });

  /* La fiche d'une chambre. <dialog> apporte la touche Échap, le piège à
     focus et le fond assombri ; il reste à verrouiller le défilement de la
     page derrière, que le navigateur ne bloque pas partout. */
  /* La carte entière et son bouton portent tous deux data-open : le clic sur
     le bouton remonte jusqu'à la carte, d'où le garde-fou — showModal() sur
     une fiche déjà ouverte lève une erreur. */
  $$("[data-open]").forEach(function (prise) {
    prise.addEventListener("click", function () {
      var fiche = document.getElementById(prise.getAttribute("data-open"));
      if (!fiche || fiche.open) return;
      if (fiche.showModal) fiche.showModal();
      else fiche.setAttribute("open", "");
      document.body.style.overflow = "hidden";
    });
  });

  $$("dialog.rmodal").forEach(function (fiche) {
    // Le verrou est relâché ici et non sur l'événement « close » : celui-ci
    // ne se déclenche pas dans tous les moteurs, même sur appel direct de
    // close(). Toutes les sorties passent par cette fonction.
    var fermer = function () {
      if (fiche.close) fiche.close();
      else fiche.removeAttribute("open");
      document.body.style.overflow = "";
    };
    var croix = $("[data-close]", fiche);
    if (croix) croix.addEventListener("click", fermer);
    // clic sur le fond assombri : la cible est la boîte de dialogue elle-même
    fiche.addEventListener("click", function (e) { if (e.target === fiche) fermer(); });
    // Échap : le navigateur le fait déjà sur un <dialog> modal, mais pas les
    // versions anciennes de Safari, et fermer deux fois ne coûte rien.
    fiche.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); fermer(); }
    });
    fiche.addEventListener("close", function () { document.body.style.overflow = ""; });
  });

  /* ------------------------------------------------ formulaire de devis */
  var form = $("[data-quote-form]");
  if (form) {
    var endpoint = form.getAttribute("data-endpoint") || "";
    var mailTo = form.getAttribute("data-mailto") || "";

    /* Les champs d'arrivée et de départ sont passés en texte libre, à la
       demande du client : le sélecteur du navigateur ne s'ouvre plus au clic.
       Le garde-fou qui vivait ici — min au jour même, départ recalé sur
       l'arrivée — est tombé avec eux. Il comparait deux chaînes AAAA-MM-JJ ;
       sur « 12/10/2026 » et « 03/11/2026 » il aurait conclu que le départ
       précède l'arrivée et écrasé ce que le visiteur venait de taper. */

    function fieldOf(el) { return el.closest(".field"); }

    function setError(el, message) {
      var wrap = fieldOf(el);
      if (!wrap) return;
      wrap.classList.toggle("is-error", Boolean(message));
      var slot = $(".err", wrap);
      if (message) {
        if (!slot) {
          slot = document.createElement("span");
          slot.className = "err";
          wrap.appendChild(slot);
        }
        slot.textContent = message;
        el.setAttribute("aria-invalid", "true");
      } else {
        if (slot) slot.remove();
        el.removeAttribute("aria-invalid");
      }
    }

    function validate() {
      var ok = true;
      var firstBad = null;
      $$("[required]", form).forEach(function (el) {
        var empty = !el.value.trim();
        var badMail = el.type === "email" && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value);
        var message = empty
          ? el.getAttribute("data-msg-required") || "Ce champ est nécessaire."
          : badMail
            ? "Cette adresse e-mail semble incomplète."
            : "";
        setError(el, message);
        if (message) { ok = false; firstBad = firstBad || el; }
      });
      if (firstBad) firstBad.focus();
      return ok;
    }

    $$("input, select, textarea", form).forEach(function (el) {
      el.addEventListener("blur", function () {
        if (fieldOf(el) && fieldOf(el).classList.contains("is-error")) validate();
      });
    });

    function summarise() {
      var lines = [];
      $$("[name]", form).forEach(function (el) {
        if (el.type === "radio" && !el.checked) return;
        if (el.type === "checkbox" && !el.checked) return;
        if (!el.value) return;
        var wrap = fieldOf(el);
        var label = wrap ? $("label", wrap) : null;
        var name = label
          ? label.childNodes[0].textContent.trim()
          : (el.getAttribute("data-label") || el.name);
        lines.push(name.replace(/\s*\*$/, "") + " : " + el.value);
      });
      return lines.join("\n");
    }

    form.addEventListener("submit", function (e) {
      if (!validate()) { e.preventDefault(); return; }

      // Sans point d'envoi configuré, on bascule sur le client mail : la
      // demande part quand même, entièrement pré-remplie.
      if (!endpoint && mailTo) {
        e.preventDefault();
        var subject = form.getAttribute("data-subject") || "Demande de séjour";
        var href = "mailto:" + mailTo +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(summarise());
        window.location.href = href;

        var done = $("[data-quote-done]");
        if (done) { done.hidden = false; done.setAttribute("tabindex", "-1"); done.focus(); }
      }
    });
  }

  /* ------------------------------- année courante dans le pied de page */
  $$("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
