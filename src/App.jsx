import { useEffect, useState } from "react";
import "./App.css";

const animesData = [];

// Structural Component
export default function App() {
    const [animes, setAnimes] = useState(animesData);
    const [query, setQuery] = useState("");
    // *Mengatasi Masalah Prop-Drilling dgn Component Composition:
    // 1. Lifting State-Up ke App, menyusun/mengerjakan hal yang spesifik ke tiap components
    // 2. Container Component, menggunakan prop 'children' (sangat efektif jika memiliki banyak components)

    const [selectedAnime, setSelectedAnime] = useState(animes[0]);

    // Fetching Jikan.moe API
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        // handling error 'too many request', menggunakan debounce query & auto retry
        const timeout = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);

        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        const controller = new AbortController();
        async function fetchAnime(retries = 0) {
            try {
                const url = query.length > 2 ? `https://api.jikan.moe/v4/anime?q=${debouncedQuery}` : "https://api.jikan.moe/v4/top/anime";
                const respond = await fetch(url, { signal: controller.signal });

                if (respond.status === 429) {
                    if (retries < 3) {
                        console.warn(`Rate limited. Retrying ${retries + 1 / 3}`);
                        setErrorMessage("🔃 Too many request. Retrying...");
                        setTimeout(() => {
                            fetchAnime(retries + 1);
                        }, 2000);
                    } else {
                        throw new Error("Too Many Requests!");
                    }
                }

                if (!respond.ok) throw new Error(`HTTP Error: ${respond.status}`);
                const data = await respond.json();

                const transformed = data.data.map((anime) => ({
                    mal_id: anime.mal_id,
                    title: anime.title,
                    source: anime.source,
                    kanji: anime.title_japanese,
                    synonyms: anime.title_synonyms,
                    year: anime.year || anime.aired.prop.from.year,
                    studios: anime.studios,
                    image: anime.images.jpg.image_url,
                    trailer: anime.trailer,
                    score: anime.score,
                    popularity: anime.popularity,
                    members: anime.members,
                    synopsis: anime.synopsis,
                    background: anime.background,
                    genres: anime.genres,
                    type: anime.type,
                    status: anime.status,
                    episodes: anime.episodes,
                    duration: anime.duration,
                    season: anime.season,
                }));
                setAnimes(transformed);
                setSelectedAnime(transformed[0]);
                setIsError(false);
                setErrorMessage("");
            } catch (err) {
                if (err.message.includes("429")) {
                    setErrorMessage("🚫 Too many request. Wait a moment.");
                } else {
                    setErrorMessage("Loading...");
                }
                setAnimes([]);
                setIsError(true);
                return err.name !== "AbortError" ? console.error("Failed to fetch anime", err) : {};
            }
        }
        fetchAnime();
        return () => controller.abort();
    }, [debouncedQuery]);

    function handleSelectedAnime(id, e) {
        document.querySelectorAll(".main .box")[1].scrollIntoView({
            behavior: "smooth",
        });

        const targetLi = e.target.tagName.toLowerCase() !== "li" ? e.target.parentElement : e.target;
        const lists = targetLi.parentElement.querySelectorAll("li");
        lists.forEach((li) => {
            li.classList.remove("focused");
            li.classList.remove("first-child");
        });
        targetLi.classList.add("focused");

        const newAnime = animes.filter((anime) => anime.mal_id === id);
        setSelectedAnime(newAnime[0]);
    }

    return (
        <>
            <Navbar>
                <Search query={query} setQuery={setQuery}>
                    <ResultText animes={animes} /> {/* Container Component */}
                </Search>
            </Navbar>

            <Main>
                <Box>
                    <AnimeList animes={animes} onSelectedAnime={handleSelectedAnime} isError={isError} errorMessage={errorMessage} />
                </Box>
                <Box>
                    <AnimeDetail selectedAnime={selectedAnime} />
                </Box>
            </Main>
            <Footer />
        </>
    );
}

// COMPONENTS:
// Stateless
function Navbar({ children }) {
    return (
        <nav className="nav-bar">
            <Logo />
            {children}
        </nav>
    );
}
// Stateless
function Logo() {
    return (
        <div className="logo" onClick={() => location.reload()}>
            <span role="img">🍥</span>
            <h1>MyANIMES</h1>
            <span role="img">🍥</span>
        </div>
    );
}
// Stateful
function Search({ children, query, setQuery }) {
    return (
        <div className="search-container">
            <input
                className="search"
                type="text"
                placeholder="&#128269; Search here.."
                value={query}
                onChange={(e) => {
                    document.querySelectorAll(".main .box")[0].scrollIntoView({
                        behavior: "smooth",
                    });
                    setQuery(e.target.value);
                }}
            />
            {children}
        </div>
    );
}
// Stateless
function ResultText({ animes }) {
    const dataLength = animes.length;
    return (
        <p className="search-results">
            Showing <strong>{dataLength}</strong> {dataLength > 1 ? "results" : "result"}
        </p>
    );
}
// Structural Component
function Main({ children }) {
    return <main className="main">{children}</main>;
}

// Stateful
// REUSABLE
function Box({ children }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="box">
            <button className="btn-toggle" onClick={() => setIsOpen((open) => !open)}>
                {isOpen ? "–" : "+"}
            </button>
            {isOpen && children}
        </div>
    );
}
// Stateful
// (tidak REUSABLE!)
// function SelectedBox({ selectedAnime }) {
//     const [isOpen2, setIsOpen2] = useState(true);

//     return (
//         <div className="box">
//             <button className="btn-toggle" onClick={() => setIsOpen2((open) => !open)}>
//                 {isOpen2 ? "–" : "+"}
//             </button>
//             {isOpen2 && <AnimeDetail selectedAnime={selectedAnime} />}
//         </div>
//     );
// }

// Stateless
function AnimeList({ animes, onSelectedAnime, isError, errorMessage }) {
    if (isError) {
        return (
            <MsgBox>
                <p className="error-msg">{errorMessage}</p>
            </MsgBox>
        );
    }
    if (animes.length === 0) {
        return (
            <MsgBox>
                <p className="loading-msg">&#128269; Searching for that title...</p>
            </MsgBox>
        );
    }

    return (
        <ul className="list list-anime">
            {animes.map((anime, index) => (
                <Anime key={`${index}#${anime.mal_id}`} anime={anime} i={index} onSelectedAnime={onSelectedAnime} />
            ))}
        </ul>
    );
}
// Stateless
function Anime({ anime, i, onSelectedAnime }) {
    return (
        <li className={i === 0 ? "first-child" : ""} onClick={(e) => onSelectedAnime(anime.mal_id, e)}>
            <img src={anime.image} alt={`${anime.title} cover`} />
            <h3>{anime.title}</h3>
            <div className="info-text">
                <p>
                    <span>
                        {anime.year ? anime.year : <UnknownData />} | {anime.type ? anime.type : <UnknownData />} | {anime.status ? anime.status : <UnknownData />}
                    </span>
                </p>
            </div>
        </li>
    );
}
// Stateless
function AnimeDetail({ selectedAnime }) {
    if (!selectedAnime) return;

    const isAvailableUrl = selectedAnime.trailer.youtube_id || selectedAnime.trailer.url || selectedAnime.trailer.embed_url;
    const embedUrl = isAvailableUrl ? "https://www.youtube.com/embed/" + selectedAnime.trailer?.youtube_id || selectedAnime.trailer?.embed_url.replace("autoplay=1", "") : null;

    return (
        <div className="details">
            <header>
                <img src={selectedAnime.image} alt={`${selectedAnime.title} cover`} />
                <div className="details-overview">
                    <h2 className="details__title">
                        {selectedAnime.title} <span>#{selectedAnime.popularity || ""}</span>
                    </h2>
                    <p className="details__kanji">
                        &#128304; {selectedAnime.kanji || <UnknownData />} {selectedAnime.synonyms.length !== 0 ? ", " + selectedAnime.synonyms.join(", ") : ""}
                    </p>
                    <p className="details__year">
                        &#128197; {selectedAnime.season || ""} {selectedAnime.year || <UnknownData />}
                    </p>
                    <p className="details__studio">&#127970; {selectedAnime.studios.map((g) => g.name).join(", ") || <UnknownData />}</p>
                    <p className="details__score">
                        &#127775; {selectedAnime.score || <UnknownData />} <span>({selectedAnime.members || <UnknownData />} watchlisted)</span>
                    </p>
                    <p className="details__genre">
                        &#127917;{" "}
                        {selectedAnime.genres.length > 0 ? (
                            selectedAnime.genres.map((g, i) => {
                                if (i >= 4) return;
                                return <span key={i}>{g.name}</span>;
                            })
                        ) : (
                            <UnknownData />
                        )}
                    </p>
                    <div className="details-time">
                        {selectedAnime.type !== "Movie" ? <p className="details__episode">&#127910; {selectedAnime.episodes} episodes</p> : null}
                        <p className="details__duration">&#8986; {selectedAnime.duration || <UnknownData />}</p>
                    </div>
                </div>
            </header>
            <section className="details__more">
                <div className="synopsis-title">
                    <h2>Synopsis</h2>
                    <span>{selectedAnime.source !== "Original" ? `Based on ${selectedAnime.source}` : `${selectedAnime.source} Story`}</span>
                </div>
                <p>{selectedAnime.synopsis}</p>
                {selectedAnime.background ? (
                    <>
                        <hr />
                        <h2>Did you know..?</h2>
                        <p>{selectedAnime.background}</p>
                    </>
                ) : (
                    ""
                )}
                {embedUrl ? (
                    <>
                        <hr />
                        <h2>Watch out of this</h2>
                        <iframe
                            width="560"
                            height="315"
                            src={embedUrl}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    </>
                ) : (
                    ""
                )}
            </section>
        </div>
    );
}

function UnknownData() {
    return <em>???</em>;
}

function MsgBox({ children }) {
    return <div className="msg-box">{children}</div>;
}

function Footer() {
    return (
        <footer>
            <p>
                coding by{" "}
                <a href="https://github.com/dimaskuy/" target="_blank" rel="noopener noreferrer">
                    Dimassu
                </a>
            </p>
            <p>
                Anime API by{" "}
                <a href="https://docs.api.jikan.moe/" target="_blank" rel="noopener noreferrer">
                    Jikan.moe
                </a>
            </p>
        </footer>
    );
}
