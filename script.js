/* =========================================================
   PERSONAL YOUTUBE MUSIC PLAYER
   MULTI-PLAYLIST VERSION
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "personal_youtube_playlists_v2";

const OLD_STORAGE_KEY = "personal_youtube_playlist_v1";


/* =========================================================
   STATE
========================================================= */

let playlists = [];

let currentPlaylistId = null;

let currentIndex = -1;

let player = null;

let playerReady = false;

let shuffleEnabled = false;

let repeatEnabled = false;

let draggedIndex = null;

let pendingDeletePlaylistId = null;


/* =========================================================
   DOM
========================================================= */

const playlistList =
    document.getElementById("playlistList");

const playlistTitle =
    document.getElementById("playlistTitle");

const linkInput =
    document.getElementById("linkInput");

const addButton =
    document.getElementById("addButton");

const linkStatus =
    document.getElementById("linkStatus");

const songList =
    document.getElementById("songList");

const songCount =
    document.getElementById("songCount");

const emptyState =
    document.getElementById("emptyState");

const nowPlayingTitle =
    document.getElementById("nowPlayingTitle");

const playerPlaceholder =
    document.getElementById("playerPlaceholder");

const shuffleButton =
    document.getElementById("shuffleButton");

const repeatButton =
    document.getElementById("repeatButton");

const previousButton =
    document.getElementById("previousButton");

const playButton =
    document.getElementById("playButton");

const nextButton =
    document.getElementById("nextButton");

const clearButton =
    document.getElementById("clearButton");

const exportButton =
    document.getElementById("exportButton");

const importButton =
    document.getElementById("importButton");

const importFile =
    document.getElementById("importFile");

const newPlaylistButton =
    document.getElementById("newPlaylistButton");


/* =========================================================
   MODALS
========================================================= */

const clearModalOverlay =
    document.getElementById("clearModalOverlay");

const cancelClear =
    document.getElementById("cancelClear");

const confirmClear =
    document.getElementById("confirmClear");


const playlistModalOverlay =
    document.getElementById("playlistModalOverlay");

const playlistModalTitle =
    document.getElementById("playlistModalTitle");

const playlistModalDescription =
    document.getElementById("playlistModalDescription");

const playlistNameInput =
    document.getElementById("playlistNameInput");

const cancelPlaylistModal =
    document.getElementById("cancelPlaylistModal");

const savePlaylistModal =
    document.getElementById("savePlaylistModal");


const deletePlaylistModalOverlay =
    document.getElementById("deletePlaylistModalOverlay");

const cancelDeletePlaylist =
    document.getElementById("cancelDeletePlaylist");

const confirmDeletePlaylist =
    document.getElementById("confirmDeletePlaylist");


/* =========================================================
   ID GENERATOR
========================================================= */

function generateId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}


/* =========================================================
   CURRENT PLAYLIST
========================================================= */

function getCurrentPlaylist() {

    let playlist =
        playlists.find(
            item => item.id === currentPlaylistId
        );

    if (!playlist) {

        if (playlists.length === 0) {

            playlist = {
                id: generateId(),
                name: "My Playlist",
                songs: []
            };

            playlists.push(playlist);

        } else {

            playlist = playlists[0];
        }

        currentPlaylistId = playlist.id;
    }

    return playlist;
}


/* =========================================================
   SAVE DATA
========================================================= */

function saveData() {

    const data = {
        version: 2,
        playlists,
        currentPlaylistId
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


/* =========================================================
   LOAD DATA
========================================================= */

function loadData() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (saved) {

            const data =
                JSON.parse(saved);

            if (
                data &&
                Array.isArray(data.playlists)
            ) {

                playlists =
                    data.playlists
                        .filter(
                            playlist =>
                                playlist &&
                                typeof playlist === "object"
                        )
                        .map(playlist => ({
                            id:
                                playlist.id ||
                                generateId(),

                            name:
                                typeof playlist.name === "string" &&
                                playlist.name.trim()
                                    ? playlist.name.trim()
                                    : "My Playlist",

                            songs:
                                Array.isArray(playlist.songs)
                                    ? playlist.songs
                                    : []
                        }));

                currentPlaylistId =
                    data.currentPlaylistId;

                if (!playlists.length) {

                    createDefaultPlaylist();

                } else if (
                    !playlists.some(
                        playlist =>
                            playlist.id === currentPlaylistId
                    )
                ) {

                    currentPlaylistId =
                        playlists[0].id;
                }

                return;
            }
        }


        /* -----------------------------------------
           MIGRATE OLD SINGLE PLAYLIST VERSION
        ----------------------------------------- */

        const oldSaved =
            localStorage.getItem(OLD_STORAGE_KEY);

        if (oldSaved) {

            const oldData =
                JSON.parse(oldSaved);

            playlists = [
                {
                    id: generateId(),

                    name:
                        typeof oldData.title === "string" &&
                        oldData.title.trim()
                            ? oldData.title.trim()
                            : "My Playlist",

                    songs:
                        Array.isArray(oldData.playlist)
                            ? oldData.playlist
                            : []
                }
            ];

            currentPlaylistId =
                playlists[0].id;

            saveData();

            return;
        }


        createDefaultPlaylist();

    } catch (error) {

        console.error(
            "Could not load playlist data:",
            error
        );

        createDefaultPlaylist();
    }
}


/* =========================================================
   DEFAULT PLAYLIST
========================================================= */

function createDefaultPlaylist() {

    const playlist = {
        id: generateId(),
        name: "My Playlist",
        songs: []
    };

    playlists = [playlist];

    currentPlaylistId =
        playlist.id;

    saveData();
}


/* =========================================================
   RENDER PLAYLIST SIDEBAR
========================================================= */

function renderPlaylistSidebar() {

    playlistList.innerHTML = "";

    playlists.forEach(playlist => {

        const item =
            document.createElement("div");

        item.className =
            "playlist-item";

        if (
            playlist.id === currentPlaylistId
        ) {
            item.classList.add("active");
        }


        /* Icon */

        const icon =
            document.createElement("span");

        icon.className =
            "playlist-item-icon";

        icon.textContent = "♫";


        /* Name */

        const name =
            document.createElement("span");

        name.className =
            "playlist-item-name";

        name.textContent =
            playlist.name;


        /* Count */

        const count =
            document.createElement("span");

        count.className =
            "playlist-item-count";

        count.textContent =
            playlist.songs.length;


        /* Delete */

        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "playlist-delete";

        deleteButton.textContent =
            "×";

        deleteButton.title =
            "Delete playlist";


        deleteButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                openDeletePlaylistModal(
                    playlist.id
                );
            }
        );


        item.appendChild(icon);

        item.appendChild(name);

        item.appendChild(count);

        item.appendChild(deleteButton);


        item.addEventListener(
            "click",
            () => {

                selectPlaylist(
                    playlist.id
                );
            }
        );


        playlistList.appendChild(item);

    });
}


/* =========================================================
   SELECT PLAYLIST
========================================================= */

function selectPlaylist(id) {

    if (
        id === currentPlaylistId
    ) {
        return;
    }

    stopPlayer();

    currentPlaylistId = id;

    currentIndex = -1;

    updatePlaylistUI();

    saveData();
}


/* =========================================================
   UPDATE PLAYLIST UI
========================================================= */

function updatePlaylistUI() {

    const playlist =
        getCurrentPlaylist();

    playlistTitle.textContent =
        playlist.name;

    renderPlaylistSidebar();

    renderSongs();

    updateNowPlaying();

    updateControls();
}


/* =========================================================
   CREATE PLAYLIST
========================================================= */

function openNewPlaylistModal() {

    playlistModalTitle.textContent =
        "New Playlist";

    playlistModalDescription.textContent =
        "Give your new playlist a name.";

    playlistNameInput.value = "";

    savePlaylistModal.textContent =
        "Create Playlist";

    playlistModalOverlay.classList.add(
        "visible"
    );

    setTimeout(() => {

        playlistNameInput.focus();

    }, 50);
}


/* =========================================================
   CREATE PLAYLIST
========================================================= */

function createPlaylist(name) {

    const cleanName =
        name.trim() || "New Playlist";

    const playlist = {

        id: generateId(),

        name: cleanName,

        songs: []
    };

    playlists.push(playlist);

    currentPlaylistId =
        playlist.id;

    currentIndex = -1;

    stopPlayer();

    updatePlaylistUI();

    saveData();

    closePlaylistModal();
}


/* =========================================================
   CLOSE PLAYLIST MODAL
========================================================= */

function closePlaylistModal() {

    playlistModalOverlay.classList.remove(
        "visible"
    );
}


/* =========================================================
   RENAME CURRENT PLAYLIST
========================================================= */

function renameCurrentPlaylist() {

    const playlist =
        getCurrentPlaylist();

    const newName =
        playlistTitle.textContent.trim();

    if (!newName) {

        playlistTitle.textContent =
            playlist.name;

        return;
    }

    playlist.name =
        newName.slice(0, 60);

    playlistTitle.textContent =
        playlist.name;

    renderPlaylistSidebar();

    saveData();
}


/* =========================================================
   DELETE PLAYLIST MODAL
========================================================= */

function openDeletePlaylistModal(id) {

    pendingDeletePlaylistId = id;

    deletePlaylistModalOverlay.classList.add(
        "visible"
    );
}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeletePlaylistModal() {

    pendingDeletePlaylistId = null;

    deletePlaylistModalOverlay.classList.remove(
        "visible"
    );
}


/* =========================================================
   DELETE PLAYLIST
========================================================= */

function deletePlaylist(id) {

    if (playlists.length <= 1) {

        /*
         Keep at least one playlist.
         Clearing the final playlist is safer
         than leaving the app with no playlist.
        */

        const playlist =
            playlists[0];

        playlist.songs = [];

        currentIndex = -1;

        stopPlayer();

        updatePlaylistUI();

        saveData();

        closeDeletePlaylistModal();

        showStatus(
            "You must keep at least one playlist. The playlist was cleared instead.",
            "success"
        );

        return;
    }


    const deletedIndex =
        playlists.findIndex(
            playlist =>
                playlist.id === id
        );

    if (deletedIndex === -1) {
        return;
    }


    const wasCurrent =
        currentPlaylistId === id;


    playlists.splice(
        deletedIndex,
        1
    );


    if (wasCurrent) {

        const nextPlaylist =
            playlists[
                Math.min(
                    deletedIndex,
                    playlists.length - 1
                )
            ];

        currentPlaylistId =
            nextPlaylist.id;

        currentIndex = -1;

        stopPlayer();
    }


    updatePlaylistUI();

    saveData();

    closeDeletePlaylistModal();
}


/* =========================================================
   YOUTUBE VIDEO ID EXTRACTION
========================================================= */

function extractVideoId(input) {

    if (!input) {
        return null;
    }

    const value =
        input.trim();

    try {

        const url =
            new URL(value);


        /* youtube.com */

        if (
            url.hostname === "youtube.com" ||
            url.hostname === "www.youtube.com" ||
            url.hostname === "music.youtube.com"
        ) {

            const videoId =
                url.searchParams.get("v");

            if (videoId) {
                return videoId;
            }


            const pathParts =
                url.pathname
                    .split("/")
                    .filter(Boolean);


            const shortsIndex =
                pathParts.indexOf("shorts");

            if (
                shortsIndex !== -1 &&
                pathParts[shortsIndex + 1]
            ) {

                return pathParts[
                    shortsIndex + 1
                ];
            }


            const embedIndex =
                pathParts.indexOf("embed");

            if (
                embedIndex !== -1 &&
                pathParts[embedIndex + 1]
            ) {

                return pathParts[
                    embedIndex + 1
                ];
            }

        }


        /* youtu.be */

        if (
            url.hostname === "youtu.be" ||
            url.hostname === "www.youtu.be"
        ) {

            return url.pathname
                .split("/")
                .filter(Boolean)[0] || null;
        }

    } catch (error) {

        /*
           If URL parsing fails, try a plain
           YouTube ID.
        */

        const match =
            value.match(
                /^[a-zA-Z0-9_-]{11}$/
            );

        return match
            ? match[0]
            : null;
    }

    return null;
}


/* =========================================================
   NORMALIZE URL
========================================================= */

function normalizeYouTubeUrl(videoId) {

    return (
        "https://www.youtube.com/watch?v=" +
        videoId
    );
}


/* =========================================================
   SPLIT INPUT INTO LINKS
========================================================= */

function parseLinks(text) {

    return text
        .split(/\s+/)
        .map(link => link.trim())
        .filter(Boolean);
}


/* =========================================================
   ADD SONGS
========================================================= */

async function addSongs() {

    const text =
        linkInput.value.trim();

    if (!text) {

        showStatus(
            "Paste at least one YouTube link.",
            "error"
        );

        return;
    }


    const links =
        parseLinks(text);


    const playlist =
        getCurrentPlaylist();


    let added = 0;

    let duplicates = 0;

    let invalid = 0;


    for (const link of links) {

        const videoId =
            extractVideoId(link);


        if (!videoId) {

            invalid++;

            continue;
        }


        const exists =
            playlist.songs.some(
                song =>
                    song.id === videoId
            );


        if (exists) {

            duplicates++;

            continue;
        }


        playlist.songs.push({

            id: videoId,

            url:
                normalizeYouTubeUrl(
                    videoId
                ),

            title:
                "Loading title..."
        });


        added++;
    }


    if (added === 0) {

        if (duplicates > 0) {

            showStatus(
                "Those songs are already in this playlist.",
                "error"
            );

        } else {

            showStatus(
                "No valid YouTube links were found.",
                "error"
            );
        }

        return;
    }


    linkInput.value = "";

    renderSongs();

    renderPlaylistSidebar();

    saveData();


    let message =
        `Added ${added} song${added === 1 ? "" : "s"}.`;


    if (duplicates > 0) {

        message +=
            ` ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped.`;
    }


    if (invalid > 0) {

        message +=
            ` ${invalid} invalid link${invalid === 1 ? "" : "s"} skipped.`;
    }


    showStatus(
        message,
        "success"
    );


    await refreshTitlesForPlaylist(
        playlist
    );
}


/* =========================================================
   FETCH YOUTUBE TITLE
========================================================= */

async function fetchYouTubeTitle(videoId) {

    try {

        const response =
            await fetch(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
            );


        if (!response.ok) {
            throw new Error("oEmbed request failed");
        }


        const data =
            await response.json();


        return (
            data.title ||
            "Unknown video"
        );

    } catch (error) {

        console.warn(
            "Could not fetch title:",
            videoId
        );

        return "YouTube Video";
    }
}


/* =========================================================
   REFRESH TITLES
========================================================= */

async function refreshTitlesForPlaylist(
    playlist
) {

    for (
        const song of playlist.songs
    ) {

        if (
            song.title &&
            song.title !== "Loading title..." &&
            song.title !== "YouTube Video"
        ) {
            continue;
        }


        const title =
            await fetchYouTubeTitle(
                song.id
            );


        song.title =
            title;


        if (
            playlist.id === currentPlaylistId
        ) {

            renderSongs();

            updateNowPlaying();
        }


        saveData();
    }
}


/* =========================================================
   RENDER SONGS
========================================================= */

function renderSongs() {

    const playlist =
        getCurrentPlaylist();

    const songs =
        playlist.songs;


    songCount.textContent =
        songs.length;


    songList.innerHTML = "";


    if (songs.length === 0) {

        emptyState.style.display =
            "flex";

        return;
    }


    emptyState.style.display =
        "none";


    songs.forEach(
        (song, index) => {

            const item =
                document.createElement("div");

            item.className =
                "song-item";

            item.draggable = true;


            if (
                index === currentIndex
            ) {

                item.classList.add(
                    "playing"
                );
            }


            /* Number */

            const number =
                document.createElement("div");

            number.className =
                "song-number";

            number.textContent =
                index + 1;


            /* Thumbnail */

            const thumbnail =
                document.createElement("img");

            thumbnail.className =
                "song-thumbnail";

            thumbnail.src =
                `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`;

            thumbnail.alt = "";


            thumbnail.onerror =
                () => {

                    thumbnail.style.display =
                        "none";
                };


            /* Info */

            const info =
                document.createElement("div");

            info.className =
                "song-info";


            const title =
                document.createElement("div");

            title.className =
                "song-title";

            title.textContent =
                song.title ||
                "YouTube Video";


            const url =
                document.createElement("div");

            url.className =
                "song-url";

            url.textContent =
                song.url;


            info.appendChild(title);

            info.appendChild(url);


            /* Actions */

            const actions =
                document.createElement("div");

            actions.className =
                "song-actions";


            const playSongButton =
                document.createElement("button");

            playSongButton.className =
                "song-action";

            playSongButton.textContent =
                "▶";

            playSongButton.title =
                "Play";


            playSongButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    playSong(index);
                }
            );


            const removeButton =
                document.createElement("button");

            removeButton.className =
                "song-action remove";

            removeButton.textContent =
                "×";

            removeButton.title =
                "Remove";


            removeButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    removeSong(index);
                }
            );


            actions.appendChild(
                playSongButton
            );

            actions.appendChild(
                removeButton
            );


            item.appendChild(number);

            item.appendChild(thumbnail);

            item.appendChild(info);

            item.appendChild(actions);


            item.addEventListener(
                "dblclick",
                () => {

                    playSong(index);
                }
            );


            /* Drag start */

            item.addEventListener(
                "dragstart",
                () => {

                    draggedIndex =
                        index;

                    item.classList.add(
                        "dragging"
                    );
                }
            );


            item.addEventListener(
                "dragend",
                () => {

                    draggedIndex = null;

                    item.classList.remove(
                        "dragging"
                    );
                }
            );


            item.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();
                }
            );


            item.addEventListener(
                "drop",
                event => {

                    event.preventDefault();

                    reorderSongs(
                        draggedIndex,
                        index
                    );
                }
            );


            songList.appendChild(item);

        }
    );
}


/* =========================================================
   REORDER SONGS
========================================================= */

function reorderSongs(
    fromIndex,
    toIndex
) {

    if (
        fromIndex === null ||
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0
    ) {
        return;
    }


    const playlist =
        getCurrentPlaylist();


    const movedSong =
        playlist.songs.splice(
            fromIndex,
            1
        )[0];


    playlist.songs.splice(
        toIndex,
        0,
        movedSong
    );


    /*
       Keep current song pointing to
       the same actual song.
    */

    if (currentIndex === fromIndex) {

        currentIndex =
            toIndex;

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


    renderSongs();

    saveData();
}


/* =========================================================
   REMOVE SONG
========================================================= */

function removeSong(index) {

    const playlist =
        getCurrentPlaylist();


    if (
        index < 0 ||
        index >= playlist.songs.length
    ) {
        return;
    }


    const removingCurrent =
        index === currentIndex;


    playlist.songs.splice(
        index,
        1
    );


    if (removingCurrent) {

        stopPlayer();

        currentIndex = -1;

    } else if (
        index < currentIndex
    ) {

        currentIndex--;
    }


    renderSongs();

    updateNowPlaying();

    renderPlaylistSidebar();

    saveData();
}


/* =========================================================
   PLAY SONG
========================================================= */

function playSong(index) {

    const playlist =
        getCurrentPlaylist();

    const songs =
        playlist.songs;


    if (
        index < 0 ||
        index >= songs.length
    ) {
        return;
    }


    currentIndex = index;


    const song =
        songs[index];


    updateNowPlaying();

    renderSongs();


    playerPlaceholder.style.display =
        "none";


    if (!playerReady) {

        showStatus(
            "The YouTube player is still loading...",
            "error"
        );

        return;
    }


    player.loadVideoById(
        song.id
    );
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlayPause() {

    if (
        !player ||
        !playerReady
    ) {
        return;
    }


    if (currentIndex === -1) {

        const playlist =
            getCurrentPlaylist();

        if (playlist.songs.length) {

            playSong(0);
        }

        return;
    }


    const state =
        player.getPlayerState();


    if (
        state === YT.PlayerState.PLAYING
    ) {

        player.pauseVideo();

    } else {

        player.playVideo();
    }
}


/* =========================================================
   NEXT
========================================================= */

function nextSong() {

    const playlist =
        getCurrentPlaylist();

    const songs =
        playlist.songs;


    if (!songs.length) {
        return;
    }


    let nextIndex;


    /* -----------------------------------------
       SHUFFLE
    ----------------------------------------- */

    if (shuffleEnabled) {

        if (songs.length === 1) {

            nextIndex = 0;

        } else {

            do {

                nextIndex =
                    Math.floor(
                        Math.random() *
                        songs.length
                    );

            } while (
                nextIndex === currentIndex
            );
        }

    }


    /* -----------------------------------------
       NORMAL ORDER
    ----------------------------------------- */

    else {

        nextIndex =
            currentIndex + 1;


        /*
           Reached the end of the playlist.
        */

        if (
            nextIndex >= songs.length
        ) {

            /*
               Repeat ON:
               Go back to the first song.
            */

            if (repeatEnabled) {

                nextIndex = 0;

            }

            /*
               Repeat OFF:
               Stay on the last song.
            */

            else {

                nextIndex =
                    songs.length - 1;
            }
        }
    }


    playSong(nextIndex);
}

/* =========================================================
   PREVIOUS
========================================================= */

function previousSong() {

    const playlist =
        getCurrentPlaylist();

    const songs =
        playlist.songs;


    if (!songs.length) {
        return;
    }


    let previousIndex =
        currentIndex - 1;


    if (
        previousIndex < 0
    ) {

        previousIndex =
            repeatEnabled
                ? songs.length - 1
                : 0;
    }


    playSong(previousIndex);
}


/* =========================================================
   PLAYER ENDED
========================================================= */

function handlePlayerEnded() {

    const playlist =
        getCurrentPlaylist();

    const songs =
        playlist.songs;


    if (!songs.length) {
        return;
    }


    /*
       If Repeat is enabled, move to the
       next song and wrap around to the
       beginning when necessary.
    */

    if (repeatEnabled) {

        nextSong();

        return;
    }


    /*
       Repeat is disabled.

       If there is another song,
       continue normally.

       If we're already on the last song,
       stop there.
    */

    if (
        currentIndex <
        songs.length - 1
    ) {

        nextSong();

    } else {

        /*
           Keep the last song selected,
           but don't restart it.
        */

        currentIndex =
            songs.length - 1;

        renderSongs();

        updateNowPlaying();

        updateControls();
    }
}

/* =========================================================
   STOP PLAYER
========================================================= */

function stopPlayer() {

    if (
        player &&
        playerReady
    ) {

        try {

            player.stopVideo();

        } catch (error) {

            console.warn(
                "Could not stop player:",
                error
            );
        }
    }


    playerPlaceholder.style.display =
        "flex";

    updateNowPlaying();
}


/* =========================================================
   UPDATE NOW PLAYING
========================================================= */

function updateNowPlaying() {

    const playlist =
        getCurrentPlaylist();

    const songs =
        playlist.songs;


    if (
        currentIndex < 0 ||
        currentIndex >= songs.length
    ) {

        nowPlayingTitle.textContent =
            "Nothing playing";

        playerPlaceholder.style.display =
            "flex";

        return;
    }


    const song =
        songs[currentIndex];


    nowPlayingTitle.textContent =
        song.title ||
        "YouTube Video";


    playerPlaceholder.style.display =
        "none";
}


/* =========================================================
   UPDATE CONTROLS
========================================================= */

function updateControls() {

    shuffleButton.classList.toggle(
        "active",
        shuffleEnabled
    );


    repeatButton.classList.toggle(
        "active",
        repeatEnabled
    );


    if (
        player &&
        playerReady
    ) {

        const state =
            player.getPlayerState();


        if (
            state === YT.PlayerState.PLAYING
        ) {

            playButton.textContent =
                "⏸";

        } else {

            playButton.textContent =
                "▶";
        }
    }
}


/* =========================================================
   YOUTUBE API READY
========================================================= */

window.onYouTubeIframeAPIReady =
    function () {

        player =
            new YT.Player(
                "player",
                {

                    videoId: "",

                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        rel: 0,
                        modestbranding: 1
                    },

                    events: {

                        onReady: () => {

                            playerReady = true;

                            updateControls();
                        },


                        onStateChange:
                            event => {

                                updateControls();


                                if (
                                    event.data ===
                                    YT.PlayerState.ENDED
                                ) {

                                    handlePlayerEnded();
                                }
                            },

                        onError:
                            event => {

                                console.warn(
                                    "YouTube player error:",
                                    event.data
                                );

                                showStatus(
                                    "This video cannot be played in the embedded player.",
                                    "error"
                                );
                            }
                    }
                }
            );
    };


/* =========================================================
   SHUFFLE
========================================================= */

shuffleButton.addEventListener(
    "click",
    () => {

        shuffleEnabled =
            !shuffleEnabled;

        updateControls();
    }
);


/* =========================================================
   REPEAT
========================================================= */

repeatButton.addEventListener(
    "click",
    () => {

        repeatEnabled =
            !repeatEnabled;

        updateControls();
    }
);


/* =========================================================
   PLAY BUTTON
========================================================= */

playButton.addEventListener(
    "click",
    togglePlayPause
);


/* =========================================================
   PREVIOUS BUTTON
========================================================= */

previousButton.addEventListener(
    "click",
    previousSong
);


/* =========================================================
   NEXT BUTTON
========================================================= */

nextButton.addEventListener(
    "click",
    nextSong
);


/* =========================================================
   ADD BUTTON
========================================================= */

addButton.addEventListener(
    "click",
    addSongs
);


/* =========================================================
   CTRL + ENTER TO ADD
========================================================= */

linkInput.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            addSongs();
        }
    }
);


/* =========================================================
   RENAME PLAYLIST
========================================================= */

playlistTitle.addEventListener(
    "blur",
    renameCurrentPlaylist
);


playlistTitle.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            playlistTitle.blur();
        }
    }
);


/* =========================================================
   NEW PLAYLIST
========================================================= */

newPlaylistButton.addEventListener(
    "click",
    openNewPlaylistModal
);


/* =========================================================
   CREATE PLAYLIST MODAL
========================================================= */

savePlaylistModal.addEventListener(
    "click",
    () => {

        createPlaylist(
            playlistNameInput.value
        );
    }
);


cancelPlaylistModal.addEventListener(
    "click",
    closePlaylistModal
);


playlistNameInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            createPlaylist(
                playlistNameInput.value
            );
        }

        if (
            event.key === "Escape"
        ) {

            closePlaylistModal();
        }
    }
);


/* =========================================================
   DELETE PLAYLIST
========================================================= */

confirmDeletePlaylist.addEventListener(
    "click",
    () => {

        if (
            pendingDeletePlaylistId
        ) {

            deletePlaylist(
                pendingDeletePlaylistId
            );
        }
    }
);


cancelDeletePlaylist.addEventListener(
    "click",
    closeDeletePlaylistModal
);


/* =========================================================
   CLEAR PLAYLIST
========================================================= */

clearButton.addEventListener(
    "click",
    () => {

        const playlist =
            getCurrentPlaylist();


        if (
            playlist.songs.length === 0
        ) {

            showStatus(
                "This playlist is already empty.",
                "error"
            );

            return;
        }


        clearModalOverlay.classList.add(
            "visible"
        );
    }
);


/* =========================================================
   CONFIRM CLEAR
========================================================= */

confirmClear.addEventListener(
    "click",
    () => {

        const playlist =
            getCurrentPlaylist();


        playlist.songs = [];

        currentIndex = -1;

        stopPlayer();

        renderSongs();

        renderPlaylistSidebar();

        updateNowPlaying();

        saveData();

        clearModalOverlay.classList.remove(
            "visible"
        );


        showStatus(
            "Playlist cleared.",
            "success"
        );
    }
);


/* =========================================================
   CANCEL CLEAR
========================================================= */

cancelClear.addEventListener(
    "click",
    () => {

        clearModalOverlay.classList.remove(
            "visible"
        );
    }
);


/* =========================================================
   CLOSE MODALS WHEN CLICKING BACKDROP
========================================================= */

clearModalOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            clearModalOverlay
        ) {

            clearModalOverlay.classList.remove(
                "visible"
            );
        }
    }
);


playlistModalOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            playlistModalOverlay
        ) {

            closePlaylistModal();
        }
    }
);


deletePlaylistModalOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            deletePlaylistModalOverlay
        ) {

            closeDeletePlaylistModal();
        }
    }
);


/* =========================================================
   EXPORT PLAYLISTS
========================================================= */

exportButton.addEventListener(
    "click",
    () => {

        const data = {

            version: 2,

            exportedAt:
                new Date().toISOString(),

            playlists,

            currentPlaylistId
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
            "my-playlists.json";

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);


        showStatus(
            "All playlists exported.",
            "success"
        );
    }
);


/* =========================================================
   IMPORT PLAYLISTS
========================================================= */

importButton.addEventListener(
    "click",
    () => {

        importFile.click();
    }
);


/* =========================================================
   HANDLE IMPORT
========================================================= */

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
            () => {

                try {

                    const data =
                        JSON.parse(
                            reader.result
                        );


                    if (
                        !data ||
                        !Array.isArray(
                            data.playlists
                        )
                    ) {

                        throw new Error(
                            "Invalid playlist file"
                        );
                    }


                    const imported =
                        data.playlists
                            .filter(
                                playlist =>
                                    playlist &&
                                    typeof playlist === "object"
                            )
                            .map(
                                playlist => ({

                                    id:
                                        generateId(),

                                    name:
                                        typeof playlist.name === "string" &&
                                        playlist.name.trim()
                                            ? playlist.name.trim()
                                            : "Imported Playlist",

                                    songs:
                                        Array.isArray(playlist.songs)
                                            ? playlist.songs
                                                .filter(
                                                    song =>
                                                        song &&
                                                        typeof song.id === "string"
                                                )
                                                .map(
                                                    song => ({
                                                        id: song.id,

                                                        url:
                                                            song.url ||
                                                            normalizeYouTubeUrl(
                                                                song.id
                                                            ),

                                                        title:
                                                            song.title ||
                                                            "YouTube Video"
                                                    })
                                                )
                                            : []
                                })
                            );


                    if (!imported.length) {

                        throw new Error(
                            "No playlists found"
                        );
                    }


                    /*
                       Avoid ID collisions by giving
                       every imported playlist a fresh ID.
                    */

                    playlists =
                        imported;


                    currentPlaylistId =
                        playlists[0].id;

                    currentIndex = -1;

                    stopPlayer();

                    saveData();

                    updatePlaylistUI();


                    showStatus(
                        `Imported ${playlists.length} playlist${playlists.length === 1 ? "" : "s"}.`,
                        "success"
                    );


                    /*
                       Refresh imported titles if needed.
                    */

                    playlists.forEach(
                        playlist => {

                            refreshTitlesForPlaylist(
                                playlist
                            );
                        }
                    );

                } catch (error) {

                    console.error(
                        "Import failed:",
                        error
                    );

                    showStatus(
                        "That file is not a valid playlist export.",
                        "error"
                    );
                }


                importFile.value = "";
            };


        reader.readAsText(file);
    }
);


/* =========================================================
   STATUS MESSAGE
========================================================= */

let statusTimeout = null;


function showStatus(
    message,
    type = ""
) {

    linkStatus.textContent =
        message;

    linkStatus.className =
        "link-status";


    if (type) {

        linkStatus.classList.add(
            type
        );
    }


    clearTimeout(
        statusTimeout
    );


    statusTimeout =
        setTimeout(
            () => {

                linkStatus.textContent =
                    "";

                linkStatus.className =
                    "link-status";

            },
            5000
        );
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           Don't trigger shortcuts while typing.
        */

        const tag =
            event.target.tagName.toLowerCase();


        if (
            tag === "input" ||
            tag === "textarea" ||
            event.target.isContentEditable
        ) {

            return;
        }


        /*
           Space = play/pause
        */

        if (
            event.code === "Space"
        ) {

            event.preventDefault();

            togglePlayPause();
        }


        /*
           Arrow Left = previous
        */

        if (
            event.code === "ArrowLeft"
        ) {

            previousSong();
        }


        /*
           Arrow Right = next
        */

        if (
            event.code === "ArrowRight"
        ) {

            nextSong();
        }


        /*
           S = shuffle
        */

        if (
            event.key.toLowerCase() === "s"
        ) {

            shuffleEnabled =
                !shuffleEnabled;

            updateControls();
        }


        /*
           R = repeat
        */

        if (
            event.key.toLowerCase() === "r"
        ) {

            repeatEnabled =
                !repeatEnabled;

            updateControls();
        }
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

loadData();

updatePlaylistUI();

updateControls();
