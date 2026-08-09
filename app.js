/*
  BUS WALI PLAYLIST
  Stable YouTube playlist controller.

  The player is deliberately recreated when switching modes.
  This avoids stale playlist state from a previous YouTube player instance.
*/

const PLAYLISTS = Object.freeze({
  "90s": {
    title: "90s Mode",
    description: "Evergreen Bollywood",
    id: "PLMRKdK25AuPVjHl9Kdb-gkBy0Cm7Zi2xo"
  },
  "new": {
    title: "New Mode",
    description: "Recent Hindi favourites",
    id: "PLO7-VO1D0_6MnOoKQGmYNY2OoCOP3GRfm"
  },
  "bhojpuri": {
    title: "Bhojpuri Mode",
    description: "Desi hits for the road",
    id: "PLczcjlYw3G_-x_-e3HhXWuB72811jN2zh"
  }
});

let player = null;
let playerReady = false;
let currentMode = "90s";
let switchToken = 0;
let progressTimer = null;

const els = {
  modeTitle: document.getElementById("modeTitle"),
  status: document.getElementById("status"),
  playBtn: document.getElementById("playBtn"),
  playIcon: document.getElementById("playIcon"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  progress: document.getElementById("progress"),
  currentTime: document.getElementById("currentTime"),
  duration: document.getElementById("duration"),
  equalizer: document.getElementById("equalizer"),
  cards: [...document.querySelectorAll(".mode-card")]
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function setUI(mode, status) {
  const data = PLAYLISTS[mode];
  els.modeTitle.textContent = data.title;
  els.status.textContent = status;

  els.cards.forEach(card => {
    const active = card.dataset.mode === mode;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function setPlaying(playing) {
  els.playIcon.textContent = playing ? "Ⅱ" : "▶";
  els.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  els.equalizer.classList.toggle("playing", playing);
}

function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function startProgress() {
  stopProgress();
  progressTimer = setInterval(() => {
    if (!player || !playerReady) return;

    const duration = Number(player.getDuration?.() || 0);
    const current = Number(player.getCurrentTime?.() || 0);

    els.currentTime.textContent = formatTime(current);
    els.duration.textContent = formatTime(duration);

    els.progress.style.width = duration > 0
      ? `${Math.min(100, Math.max(0, current / duration * 100))}%`
      : "0%";
  }, 500);
}

function destroyPlayer() {
  stopProgress();
  playerReady = false;

  if (player) {
    try {
      player.stopVideo();
      player.destroy();
    } catch (_) {}
    player = null;
  }

  const old = document.getElementById("youtube-player");
  if (old) old.remove();

  const host = document.createElement("div");
  host.id = "youtube-player";
  document.body.appendChild(host);
}

function createPlayer(mode, token, autoplay) {
  const data = PLAYLISTS[mode];

  player = new YT.Player("youtube-player", {
    width: "320",
    height: "180",
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: event => {
        if (token !== switchToken) {
          try { event.target.destroy(); } catch (_) {}
          return;
        }

        playerReady = true;
        els.playBtn.disabled = false;
        els.prevBtn.disabled = false;
        els.nextBtn.disabled = false;

        // Start only after the newly-created player is ready.
        if (autoplay) {
          event.target.playVideo();
        } else {
          setUI(mode, "Ready to start");
        }
      },

      onStateChange: event => {
        if (token !== switchToken) return;

        const s = event.data;

        if (s === YT.PlayerState.PLAYING) {
          setPlaying(true);
          els.status.textContent = "Playing";
          startProgress();
        } else if (s === YT.PlayerState.PAUSED) {
          setPlaying(false);
          els.status.textContent = "Paused";
          stopProgress();
        } else if (s === YT.PlayerState.BUFFERING) {
          els.status.textContent = "Buffering…";
        } else if (s === YT.PlayerState.CUED) {
          setPlaying(false);
          els.status.textContent = "Ready to start";
        } else if (s === YT.PlayerState.ENDED) {
          setPlaying(false);
          els.status.textContent = "Playlist ended";
          stopProgress();
        }
      },

      onError: event => {
        if (token !== switchToken) return;
        setPlaying(false);
        stopProgress();

        const messages = {
          2: "YouTube rejected the playlist request.",
          5: "This video cannot be played in the HTML5 player.",
          100: "A video in this playlist is unavailable.",
          101: "Playback is restricted for this video.",
          150: "Playback is restricted for this video."
        };

        els.status.textContent = messages[event.data] || "Playback error";
      }
    }
  });

  setUI(mode, autoplay ? "Loading…" : "Ready to start");
}

function switchMode(mode) {
  if (!PLAYLISTS[mode] || mode === currentMode && playerReady) return;

  currentMode = mode;
  const token = ++switchToken;

  setUI(mode, "Switching playlist…");
  setPlaying(false);
  stopProgress();
  els.progress.style.width = "0%";
  els.currentTime.textContent = "0:00";
  els.duration.textContent = "0:00";

  els.playBtn.disabled = true;
  els.prevBtn.disabled = true;
  els.nextBtn.disabled = true;

  // Critical: destroy the old player completely before creating the new one.
  destroyPlayer();

  if (window.YT?.Player) {
    createPlayer(mode, token, true);
  } else {
    els.status.textContent = "Loading player…";
    waitForYouTube(mode, token);
  }
}

function waitForYouTube(mode, token) {
  const started = Date.now();

  const timer = setInterval(() => {
    if (token !== switchToken) {
      clearInterval(timer);
      return;
    }

    if (window.YT?.Player) {
      clearInterval(timer);
      createPlayer(mode, token, true);
    } else if (Date.now() - started > 15000) {
      clearInterval(timer);
      els.status.textContent = "YouTube player failed to load";
      els.playBtn.disabled = false;
    }
  }, 100);
}

function togglePlay() {
  if (!playerReady || !player) return;

  const state = player.getPlayerState();

  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

els.cards.forEach(card => {
  card.addEventListener("click", () => switchMode(card.dataset.mode));
});

els.playBtn.addEventListener("click", togglePlay);

els.prevBtn.addEventListener("click", () => {
  if (!playerReady || !player) return;
  player.previousVideo();
});

els.nextBtn.addEventListener("click", () => {
  if (!playerReady || !player) return;
  player.nextVideo();
});

document.addEventListener("keydown", event => {
  if (event.target.matches("input, textarea, select")) return;

  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  } else if (event.code === "ArrowLeft") {
    if (playerReady) player.previousVideo();
  } else if (event.code === "ArrowRight") {
    if (playerReady) player.nextVideo();
  }
});

window.onYouTubeIframeAPIReady = function () {
  // Initial mode is loaded only after the API is available.
  createPlayer("90s", switchToken, false);
};
