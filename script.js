/* =========================================================
   PERSONAL YOUTUBE PLAYLIST PLAYER
   Frontend-only / GitHub Pages
   ========================================================= */


/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

const STORAGE_KEY = "personal_youtube_playlist_v1";

let playlist = [];
let currentIndex = -1;

let player = null;
let playerReady = false;

let shuffleEnabled = false;
let repeatEnabled = false;

let draggedIndex = null;


/* ---------------------------------------------------------
   DOM
--------------------------------------------------------- */

const linkInput = document.getElementById("linkInput");
const addButton = document.getElementById("addButton");
const linkStatus = document.getElementById("linkStatus");

const songList = document.getElementById("songList");
const songCount = document.getElementById("songCount");

const playlistTitle = document.getElementById("playlistTitle");

const nowPlayingTitle =
    document.getElementById("nowPlayingTitle");

const nowPlayingNumber =
    document.getElementById("nowPlayingNumber");

const playerPlaceholder =
    document.getElementById("playerPlaceholder");

const playButton =
    document.getElementById("playButton");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const shuffleButton =
    document.getElementById("shuffleButton");

const repeatButton =
    document.getElementById("repeatButton");

const clearButton =
    document.getElementById("clearButton");

const modalOverlay =
    document.getElementById("modalOverlay");

const cancelClear =
    document.getElementById("cancelClear");

const confirmClear =
    document.getElementById("confirmClear");

const exportButton =
    document.getElementById("exportButton");

const importButton =
    document.getElementById("importButton");

const importFile =
    document.getElementById("importFile");


/* ---------------------------------------------------------
   YOUTUBE IFRAME API
--------------------------------------------------------- */

window.onYouTubeIframeAPIReady = function () {

    player = new YT.Player("player", {

        width: "100%",
        height: "100%",

        playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1
        },

        events: {

            onReady: function () {

                playerReady = true;

                updatePlayButton();

            },

            onStateChange: function (event) {

                handlePlayerState(event);

            }

        }

    });

};


/* ---------------------------------------------------------
   LOAD / SAVE
--------------------------------------------------------- */

function savePlaylist() {

    const data = {

        title:
            playlistTitle.textContent.trim() ||
            "My Playlist",

        playlist: playlist,

        currentIndex: currentIndex,

        shuffleEnabled: shuffleEnabled,

        repeatEnabled: repeatEnabled

    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}


function loadPlaylist() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            renderPlaylist();

            return;

        }

        const data =
            JSON.parse(saved);

        playlist =
            Array.isArray(data.playlist)
                ? data.playlist
                : [];

        currentIndex =
            Number.isInteger(data.currentIndex)
                ? data.currentIndex
                : -1;

        shuffleEnabled =
            Boolean(data.shuffleEnabled);

        repeatEnabled =
            Boolean(data.repeatEnabled);

        if (data.title) {

            playlistTitle.textContent =
                data.title;

        }

        if (
            currentIndex < 0 ||
            currentIndex >= playlist.length
        ) {

            currentIndex = -1;

        }

        shuffleButton.classList.toggle(
            "active",
            shuffleEnabled
        );

        repeatButton.classList.toggle(
            "active",
            repeatEnabled
        );

        renderPlaylist();

        updateNowPlaying();

    } catch (error) {

        console.error(
            "Could not load playlist:",
            error
        );

        playlist = [];

        currentIndex = -1;

        renderPlaylist();

    }

}


/* ---------------------------------------------------------
   URL PARSING
--------------------------------------------------------- */

function extractVideoId(urlString) {

    try {

        const url =
            new URL(urlString);

        const hostname =
            url.hostname.toLowerCase();


        /*
           youtube.com/watch?v=...
        */

        if (
            hostname.includes("youtube.com") ||
            hostname.includes("youtube-nocookie.com")
        ) {

            const videoId =
                url.searchParams.get("v");

            if (videoId) {

                return videoId;

            }


            /*
               /shorts/VIDEO_ID
            */

            const shortsMatch =
                url.pathname.match(
                    /\/shorts\/([^/?]+)/
                );

            if (shortsMatch) {

                return shortsMatch[1];

            }


            /*
               /embed/VIDEO_ID
            */

            const embedMatch =
                url.pathname.match(
                    /\/embed\/([^/?]+)/
                );

            if (embedMatch) {

                return embedMatch[1];

            }

        }


        /*
           youtu.be/VIDEO_ID
        */

        if (
            hostname === "youtu.be" ||
            hostname.endsWith(".youtu.be")
        ) {

            const id =
                url.pathname.split("/")[1];

            if (id) {

                return id;

            }

        }

    } catch (error) {

        return null;

    }

    return null;

}


/* ---------------------------------------------------------
   GET LINKS FROM TEXT
--------------------------------------------------------- */

function extractLinks(text) {

    return text
        .split(/\s+/)
        .map(link => link.trim())
        .filter(link => {

            return (
                link.startsWith("http://") ||
                link.startsWith("https://")
            );

        });

}


/* ---------------------------------------------------------
   ADD SONGS
--------------------------------------------------------- */

function addSongs() {

    const text =
        linkInput.value.trim();

    if (!text) {

        setStatus(
            "Paste at least one link.",
            true
        );

        return;

    }

    const links =
        extractLinks(text);

    let added = 0;
    let skipped = 0;

    links.forEach(link => {

        const videoId =
            extractVideoId(link);

        if (!videoId) {

            skipped++;

            return;

        }


        /*
           Prevent duplicates.
        */

        const alreadyExists =
            playlist.some(
                song => song.id === videoId
            );

        if (alreadyExists) {

            skipped++;

            return;

        }


        playlist.push({

            id: videoId,

            url:
                normalizeYouTubeUrl(
                    videoId
                ),

            title:
                "YouTube Video " +
                (playlist.length + 1)

        });

        added++;

    });


    linkInput.value = "";

    renderPlaylist();

    savePlaylist();


    if (added > 0) {

        if (skipped > 0) {

            setStatus(
                `${added} added • ${skipped} skipped`
            );

        } else {

            setStatus(
                `${added} song${added === 1 ? "" : "s"} added`
            );

        }

    } else {

        setStatus(
            "No valid new YouTube links found.",
            true
        );

    }


    refreshTitles();

}


function normalizeYouTubeUrl(videoId) {

    return `https://www.youtube.com/watch?v=${videoId}`;

}


/* ---------------------------------------------------------
   RETRIEVE TITLES
--------------------------------------------------------- */

async function refreshTitles() {

    for (
        let i = 0;
        i < playlist.length;
        i++
    ) {

        const song = playlist[i];

        try {

            const response =
                await fetch(
                    `https://www.youtube.com/oembed?url=${encodeURIComponent(song.url)}&format=json`
                );

            if (!response.ok) {

                continue;

            }

            const data =
                await response.json();

            if (data.title) {

                song.title =
                    data.title;

            }

            if (i === currentIndex) {

                updateNowPlaying();

            }

            renderPlaylist();

            savePlaylist();

        } catch (error) {

            /*
               Keep fallback title if the request fails.
            */

        }

    }

}


/* ---------------------------------------------------------
   RENDER PLAYLIST
--------------------------------------------------------- */

function renderPlaylist() {

    songList.innerHTML = "";

    songCount.textContent =
        playlist.length;


    if (playlist.length === 0) {

        songList.appendChild(
            createEmptyState()
        );

        return;

    }


    playlist.forEach(
        (song, index) => {

            const element =
                createSongElement(
                    song,
                    index
                );

            songList.appendChild(
                element
            );

        }
    );

}


function createEmptyState() {

    const element =
        document.createElement("div");

    element.className =
        "empty-state";

    element.innerHTML = `

        <div class="empty-icon">
            ♫
        </div>

        <h3>Your playlist is empty</h3>

        <p>
            Paste some YouTube links above to get started.
        </p>

    `;

    return element;

}


/* ---------------------------------------------------------
   CREATE SONG
--------------------------------------------------------- */

function createSongElement(song, index) {

    const element =
        document.createElement("div");

    element.className =
        "song";

    if (index === currentIndex) {

        element.classList.add(
            "playing"
        );

    }

    element.draggable = true;

    element.dataset.index = index;


    /* DRAG EVENTS */

    element.addEventListener(
        "dragstart",
        () => {

            draggedIndex = index;

            element.classList.add(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragend",
        () => {

            element.classList.remove(
                "dragging"
            );

            draggedIndex = null;

        }
    );


    element.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    element.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            const targetIndex =
                Number(
                    element.dataset.index
                );

            reorderSongs(
                draggedIndex,
                targetIndex
            );

        }
    );


    /* NUMBER */

    const number =
        document.createElement("div");

    number.className =
        "song-number";

    number.textContent =
        String(index + 1).padStart(2, "0");


    /* THUMBNAIL */

    const thumbnail =
        document.createElement("div");

    thumbnail.className =
        "song-thumbnail";

    const image =
        document.createElement("img");

    image.src =
        `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`;

    image.alt = "";

    image.loading = "lazy";

    thumbnail.appendChild(
        image
    );


    /* INFO */

    const info =
        document.createElement("div");

    info.className =
        "song-info";


    const title =
        document.createElement("div");

    title.className =
        "song-title";

    title.textContent =
        song.title;


    const url =
        document.createElement("div");

    url.className =
        "song-url";

    url.textContent =
        song.url;


    info.appendChild(title);
    info.appendChild(url);


    /* ACTIONS */

    const actions =
        document.createElement("div");

    actions.className =
        "song-actions";


    const play =
        document.createElement("button");

    play.className =
        "song-action";

    play.title =
        "Play";

    play.textContent =
        "▶";


    play.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            playSong(index);

        }
    );


    const remove =
        document.createElement("button");

    remove.className =
        "song-action delete";

    remove.title =
        "Remove";

    remove.textContent =
        "×";


    remove.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            removeSong(index);

        }
    );


    actions.appendChild(play);
    actions.appendChild(remove);


    /* CLICK SONG */

    element.addEventListener(
        "click",
        () => {

            playSong(index);

        }
    );


    element.appendChild(number);
    element.appendChild(thumbnail);
    element.appendChild(info);
    element.appendChild(actions);


    return element;

}


/* ---------------------------------------------------------
   REORDER
--------------------------------------------------------- */

function reorderSongs(fromIndex, toIndex) {

    if (
        fromIndex === null ||
        fromIndex === toIndex
    ) {

        return;

    }


    const movedSong =
        playlist.splice(
            fromIndex,
            1
        )[0];


    playlist.splice(
        toIndex,
        0,
        movedSong
    );


    /*
       Keep current song pointing to the same song.
    */

    if (currentIndex === fromIndex) {

        currentIndex = toIndex;

    } else if (
        fromIndex < currentIndex &&
        toIndex >= currentIndex
    ) {

        currentIndex--;

    } else if (
        fromIndex > currentIndex &&
        toIndex <= currentIndex
    ) {

        currentIndex++;

    }


    renderPlaylist();

    savePlaylist();

}


/* ---------------------------------------------------------
   PLAY SONG
--------------------------------------------------------- */

function playSong(index) {

    if (
        index < 0 ||
        index >= playlist.length
    ) {

        return;

    }

    currentIndex = index;

    const song =
        playlist[currentIndex];


    updateNowPlaying();

    renderPlaylist();

    savePlaylist();


    if (!playerReady || !player) {

        return;

    }


    player.loadVideoById(
        song.id
    );

    player.playVideo();

    updatePlayButton();

}


/* ---------------------------------------------------------
   NEXT
--------------------------------------------------------- */

function nextSong() {

    if (playlist.length === 0) {

        return;

    }


    let nextIndex;


    if (shuffleEnabled) {

        if (playlist.length === 1) {

            nextIndex = 0;

        } else {

            do {

                nextIndex =
                    Math.floor(
                        Math.random() *
                        playlist.length
                    );

            } while (
                nextIndex === currentIndex
            );

        }

    } else {

        nextIndex =
            currentIndex + 1;

        if (
            nextIndex >=
            playlist.length
        ) {

            if (repeatEnabled) {

                nextIndex = 0;

            } else {

                currentIndex =
                    playlist.length - 1;

                updateNowPlaying();

                return;

            }

        }

    }


    playSong(nextIndex);

}


/* ---------------------------------------------------------
   PREVIOUS
--------------------------------------------------------- */

function previousSong() {

    if (playlist.length === 0) {

        return;

    }


    /*
       If current song has been playing for more
       than 3 seconds, restart it.
    */

    if (
        playerReady &&
        player &&
        typeof player.getCurrentTime === "function"
    ) {

        const time =
            player.getCurrentTime();

        if (time > 3) {

            player.seekTo(
                0,
                true
            );

            return;

        }

    }


    let previousIndex =
        currentIndex - 1;


    if (previousIndex < 0) {

        previousIndex =
            repeatEnabled
                ? playlist.length - 1
                : 0;

    }


    playSong(previousIndex);

}


/* ---------------------------------------------------------
   PLAY / PAUSE
--------------------------------------------------------- */

function togglePlay() {

    if (!playerReady || !player) {

        if (playlist.length > 0) {

            playSong(
                currentIndex >= 0
                    ? currentIndex
                    : 0
            );

        }

        return;

    }


    const state =
        player.getPlayerState();


    if (
        state ===
        YT.PlayerState.PLAYING
    ) {

        player.pauseVideo();

    } else {

        if (currentIndex === -1) {

            playSong(0);

        } else {

            player.playVideo();

        }

    }

}


function updatePlayButton() {

    if (!playerReady || !player) {

        playButton.textContent =
            "▶";

        return;

    }


    const state =
        player.getPlayerState();


    if (
        state ===
        YT.PlayerState.PLAYING
    ) {

        playButton.textContent =
            "Ⅱ";

    } else {

        playButton.textContent =
            "▶";

    }

}


/* ---------------------------------------------------------
   PLAYER STATE
--------------------------------------------------------- */

function handlePlayerState(event) {

    updatePlayButton();


    if (
        event.data ===
        YT.PlayerState.ENDED
    ) {

        if (repeatEnabled) {

            player.seekTo(
                0,
                true
            );

            player.playVideo();

        } else {

            nextSong();

        }

    }

}


/* ---------------------------------------------------------
   NOW PLAYING
--------------------------------------------------------- */

function updateNowPlaying() {

    if (
        currentIndex < 0 ||
        currentIndex >= playlist.length
    ) {

        nowPlayingTitle.textContent =
            "Nothing playing";

        nowPlayingNumber.textContent =
            "Select a song from your playlist";

        playerPlaceholder.style.display =
            "flex";

        return;

    }


    const song =
        playlist[currentIndex];


    nowPlayingTitle.textContent =
        song.title;


    nowPlayingNumber.textContent =
        `Song ${currentIndex + 1} of ${playlist.length}`;


    playerPlaceholder.style.display =
        "none";

}


/* ---------------------------------------------------------
   REMOVE SONG
--------------------------------------------------------- */

function removeSong(index) {

    const wasCurrent =
        index === currentIndex;


    playlist.splice(
        index,
        1
    );


    if (playlist.length === 0) {

        currentIndex = -1;

        if (playerReady && player) {

            player.stopVideo();

        }

    } else if (wasCurrent) {

        if (
            currentIndex >=
            playlist.length
        ) {

            currentIndex =
                playlist.length - 1;

        }

        playSong(currentIndex);

    } else if (index < currentIndex) {

        currentIndex--;

    }


    renderPlaylist();

    updateNowPlaying();

    savePlaylist();

}


/* ---------------------------------------------------------
   CLEAR PLAYLIST
--------------------------------------------------------- */

clearButton.addEventListener(
    "click",
    () => {

        if (playlist.length === 0) {

            return;

        }

        modalOverlay.classList.add(
            "show"
        );

    }
);


cancelClear.addEventListener(
    "click",
    () => {

        modalOverlay.classList.remove(
            "show"
        );

    }
);


confirmClear.addEventListener(
    "click",
    () => {

        playlist = [];

        currentIndex = -1;

        if (playerReady && player) {

            player.stopVideo();

        }

        renderPlaylist();

        updateNowPlaying();

        savePlaylist();

        modalOverlay.classList.remove(
            "show"
        );

        setStatus(
            "Playlist cleared"
        );

    }
);


/* ---------------------------------------------------------
   SHUFFLE
--------------------------------------------------------- */

shuffleButton.addEventListener(
    "click",
    () => {

        shuffleEnabled =
            !shuffleEnabled;

        shuffleButton.classList.toggle(
            "active",
            shuffleEnabled
        );

        savePlaylist();

        setStatus(
            shuffleEnabled
                ? "Shuffle enabled"
                : "Shuffle disabled"
        );

    }
);


/* ---------------------------------------------------------
   REPEAT
--------------------------------------------------------- */

repeatButton.addEventListener(
    "click",
    () => {

        repeatEnabled =
            !repeatEnabled;

        repeatButton.classList.toggle(
            "active",
            repeatEnabled
        );

        savePlaylist();

        setStatus(
            repeatEnabled
                ? "Repeat enabled"
                : "Repeat disabled"
        );

    }
);


/* ---------------------------------------------------------
   PLAY CONTROLS
--------------------------------------------------------- */

addButton.addEventListener(
    "click",
    addSongs
);


playButton.addEventListener(
    "click",
    togglePlay
);


nextButton.addEventListener(
    "click",
    nextSong
);


previousButton.addEventListener(
    "click",
    previousSong
);


/* ---------------------------------------------------------
   CTRL + ENTER
--------------------------------------------------------- */

linkInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            event.ctrlKey
        ) {

            event.preventDefault();

            addSongs();

        }

    }
);


/* ---------------------------------------------------------
   STATUS
--------------------------------------------------------- */

function setStatus(
    message,
    error = false
) {

    linkStatus.textContent =
        message;

    linkStatus.style.color =
        error
            ? "#ff6878"
            : "";

}


/* ---------------------------------------------------------
   PLAYLIST TITLE
--------------------------------------------------------- */

playlistTitle.addEventListener(
    "blur",
    () => {

        if (
            !playlistTitle.textContent.trim()
        ) {

            playlistTitle.textContent =
                "My Playlist";

        }

        document.title =
            playlistTitle.textContent.trim();

        savePlaylist();

    }
);


playlistTitle.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            playlistTitle.blur();

        }

    }
);


/* ---------------------------------------------------------
   EXPORT
--------------------------------------------------------- */

exportButton.addEventListener(
    "click",
    () => {

        const data = {

            title:
                playlistTitle.textContent.trim(),

            playlist:
                playlist,

            shuffleEnabled:
                shuffleEnabled,

            repeatEnabled:
                repeatEnabled

        };


        const blob =
            new Blob(
                [
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "my-playlist.json";

        link.click();


        URL.revokeObjectURL(
            url
        );

        setStatus(
            "Playlist exported"
        );

    }
);


/* ---------------------------------------------------------
   IMPORT
--------------------------------------------------------- */

importButton.addEventListener(
    "click",
    () => {

        importFile.click();

    }
);


importFile.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (!file) {

            return;

        }


        const reader =
            new FileReader();


        reader.onload =
            function () {

                try {

                    const data =
                        JSON.parse(
                            reader.result
                        );


                    if (
                        !Array.isArray(
                            data.playlist
                        )
                    ) {

                        throw new Error(
                            "Invalid playlist"
                        );

                    }


                    playlist =
                        data.playlist.filter(
                            song =>
                                song &&
                                song.id
                        );


                    shuffleEnabled =
                        Boolean(
                            data.shuffleEnabled
                        );

                    repeatEnabled =
                        Boolean(
                            data.repeatEnabled
                        );


                    if (data.title) {

                        playlistTitle.textContent =
                            data.title;

                    }


                    currentIndex = -1;


                    shuffleButton.classList.toggle(
                        "active",
                        shuffleEnabled
                    );

                    repeatButton.classList.toggle(
                        "active",
                        repeatEnabled
                    );


                    renderPlaylist();

                    updateNowPlaying();

                    savePlaylist();


                    setStatus(
                        `${playlist.length} songs imported`
                    );


                    refreshTitles();


                } catch (error) {

                    console.error(error);

                    setStatus(
                        "Invalid playlist file.",
                        true
                    );

                }

            };


        reader.readAsText(file);


        importFile.value = "";

    }
);


/* ---------------------------------------------------------
   KEYBOARD SHORTCUTS
--------------------------------------------------------- */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.target.tagName ===
            "TEXTAREA" ||
            event.target.isContentEditable
        ) {

            return;

        }


        switch (event.code) {

            case "Space":

                event.preventDefault();

                togglePlay();

                break;


            case "ArrowRight":

                nextSong();

                break;


            case "ArrowLeft":

                previousSong();

                break;

        }

    }
);


/* ---------------------------------------------------------
   INITIALIZE
--------------------------------------------------------- */

loadPlaylist();


/*
   If YouTube's API is already loaded before this script
   executes, initialize manually.
*/

if (
    window.YT &&
    window.YT.Player &&
    !player
) {

    window.onYouTubeIframeAPIReady();

}
