const PLAYLISTS = {
  "90s": {
    title: "90s Mode",
    description: "Evergreen Bollywood",
    id: "PLMRKdK25AuPVjHl9Kdb-gkBy0Cm7Zi2xo"
  },
  "new": {
    title: "New Mode",
    description: "Recent favourites",
    id: "PLO7-VO1D0_6MnOoKQGmYNY2OoCOP3GRfm"
  },
  "bhojpuri": {
    title: "Bhojpuri Mode",
    description: "Bhojpuri playlist",
    id: "PLczcjlYw3G_-x_-e3HhXWuB72811jN2zh"
  }
};

let player = null;
let playerReady = false;
let currentMode = "90s";
let isPlaying = false;
let progressTimer = null;

const modeTitle = document.getElementById("modeTitle");
const statusText = document.getElementById("status");
const playIcon = document.getElementById("playIcon");
const pulse = document.getElementById("pulse");
const progressBar = document.getElementById("progressBar");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player("youtube-player", {
    width: "1",
    height: "1",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: () => {
        playerReady = true;
        statusText.textContent = "Tap a mode to start";
      },
      onStateChange: handlePlayerState,
      onError: () => {
        statusText.textContent = "This playlist could not be played.";
        setPlaying(false);
      }
    }
  });
};

function setActiveMode(mode) {
  currentMode = mode;
  const data = PLAYLISTS[mode];

  document.querySelectorAll(".mode-card").forEach(card => {
    const active = card.dataset.mode === mode;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });

  modeTitle.textContent = data.title;
  statusText.textContent = data.description;
}

function loadMode(mode, shouldPlay = true) {
  setActiveMode(mode);

  if (!playerReady || !player) {
    statusText.textContent = "Player is loading…";
    return;
  }

  const playlistId = PLAYLISTS[mode].id;

  // loadPlaylist loads the first video of the selected playlist.
  player.loadPlaylist({
    listType: "playlist",
    list: playlistId,
    index: 0,
    startSeconds: 0
  });

  if (shouldPlay) {
    // The call is initiated by the user's mode-button click,
    // which satisfies normal browser autoplay interaction rules.
    setTimeout(() => {
      try {
        player.playVideo();
      } catch (_) {}
    }, 250);
  }

  statusText.textContent = shouldPlay ? "Loading…" : "Ready";
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

function handlePlayerState(event) {
  if (!window.YT) return;

  if (event.data === YT.PlayerState.PLAYING) {
    setPlaying(true);
    statusText.textContent = "Playing";
    startProgress();
  } else if (event.data === YT.PlayerState.PAUSED) {
    setPlaying(false);
    statusText.textContent = "Paused";
    stopProgress();
  } else if (event.data === YT.PlayerState.ENDED) {
    setPlaying(false);
    statusText.textContent = "Playlist ended";
    stopProgress();
  } else if (event.data === YT.PlayerState.BUFFERING) {
    statusText.textContent = "Buffering…";
  } else if (event.data === YT.PlayerState.CUED) {
    setPlaying(false);
    statusText.textContent = "Ready";
  }
}

function setPlaying(value) {
  isPlaying = value;
  playIcon.textContent = value ? "Ⅱ" : "▶";
  playBtn.setAttribute("aria-label", value ? "Pause" : "Play");
  playBtn.setAttribute("title", value ? "Pause" : "Play");
  pulse.classList.toggle("playing", value);
}

function startProgress() {
  stopProgress();

  progressTimer = setInterval(() => {
    if (!player || !player.getDuration) return;

    const duration = player.getDuration();
    const current = player.getCurrentTime();

    if (duration > 0) {
      progressBar.style.width = `${Math.min(100, (current / duration) * 100)}%`;
    }
  }, 500);
}

function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

document.querySelectorAll(".mode-card").forEach(card => {
  card.addEventListener("click", () => {
    loadMode(card.dataset.mode, true);
  });
});

playBtn.addEventListener("click", togglePlay);

prevBtn.addEventListener("click", () => {
  if (!playerReady || !player) return;
  player.previousVideo();
});

nextBtn.addEventListener("click", () => {
  if (!playerReady || !player) return;
  player.nextVideo();
});

// Keyboard convenience without adding visible UI.
document.addEventListener("keydown", event => {
  if (event.target.matches("input, textarea, select")) return;

  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  } else if (event.code === "ArrowLeft") {
    player?.previousVideo();
  } else if (event.code === "ArrowRight") {
    player?.nextVideo();
  }
});
