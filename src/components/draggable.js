'use client';
import { useEffect, useState, useRef } from 'react';
import { readDir, BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
import { parseBuffer } from 'music-metadata';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './draggable.module.css';

const SortableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </li>
  );
};

const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState([]);
  const [originalPlaylist, setOriginalPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [metadata, setMetadata] = useState(null);
  const audioRef = useRef(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [isLoop, setIsLoop] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  const handleLoop = () => {
    setIsLoop((prevLoop) => !prevLoop);
  };

  const handleSongEnd = () => {
    if (isLoop) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      setCurrentSongIndex((prevIndex) => (prevIndex + 1) % playlist.length);
    }
  };

  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const entries = await readDir('Musique', { baseDir: BaseDirectory.Home });
        const songs = entries.map((entry, index) => ({
          id: index,
          name: entry.name,
          path: `Musique/${entry.name}`,
        }));
        setPlaylist(songs);
        setOriginalPlaylist(songs);
      } catch (error) {
        console.error('Error reading directory:', error);
      }
    };
    loadPlaylist();
  }, []);

  useEffect(() => {
    if (audioRef.current && playlist.length > 0) {
      const fetchMetadata = async (path) => {
        try {
          const fileContents = await readFile(path, { baseDir: BaseDirectory.Home });
          const metadata = await parseBuffer(Buffer.from(fileContents));
          setMetadata(metadata);

          const blob = new Blob([new Uint8Array(fileContents)], { type: 'audio/mp4' });
          const audioUrl = URL.createObjectURL(blob);

          audioRef.current.src = audioUrl;
        } catch (error) {
          console.error('Erreur de lecture du fichier:', error);
        }
      };
      fetchMetadata(playlist[currentSongIndex].path);
    }
  }, [currentSongIndex, playlist]);

  useEffect(() => {
    if (metadata && playlist[currentSongIndex]) {
      fetchLyrics();
    }
  }, [currentSongIndex, metadata, playlist]);

  const shufflePlaylist = () => {
    let shuffled = [...playlist];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleNextSong = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % playlist.length);
  };

  const handlePreviousSong = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex - 1 + playlist.length) % playlist.length);
  };

  const handleShuffle = () => {
    setIsShuffle((prevShuffle) => {
      const newShuffleState = !prevShuffle;
      if (newShuffleState) {
        setPlaylist(shufflePlaylist());
      } else {
        setPlaylist(originalPlaylist);
      }
      return newShuffleState;
    });
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over.id) {
      setPlaylist((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setOriginalPlaylist(playlist);
    }
  };

  const fetchLyrics = async () => {
    setIsLoadingLyrics(true);
    try {
      const songNameWithoutExtension = playlist[currentSongIndex].name.replace(/\.m4a$/, '');
      const artist = metadata.common.artist || 'Artiste inconnu';
      const response = await fetch(`https://api.lyrics.ovh/v1/${artist}/${songNameWithoutExtension}`);
      const data = await response.json();
      if (!data.lyrics) {
        setLyrics('Paroles non disponibles pour cette chanson.');
      } else {
        setLyrics(data.lyrics);
      }
    } catch (error) {
      console.error('Erreur de récupération des paroles:', error);
      setLyrics('Erreur lors de la récupération des paroles.');
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const LyricsDisplay = ({ lyrics }) => {
    return (
      <div className="lyrics">
        {lyrics.split('\n').map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.container1}>
          {metadata && (
            <div className={styles.player}>
              <div>
                {metadata.common.picture?.[0] && (
                  <div>
                    <div
                      className={styles.background}
                      style={{
                        background: `url(${URL.createObjectURL(
                          new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format })
                        )}) center/cover`
                      }}
                    ></div>
                    <div className={styles.foreground}>
                      <img
                        src={URL.createObjectURL(
                          new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format })
                        )}
                        alt="Cover"
                      />
                    </div>
                  </div>
                )}
                <h2>{metadata.common.artist} - {metadata.common.title || playlist[currentSongIndex].name}</h2>
              </div>
            </div>
          )}

          <div className={styles.controls}>
            <audio ref={audioRef} id="audioPlayer" preload="auto" controls onEnded={handleSongEnd}></audio>
            <div className={styles.btn}>
              <button onClick={handlePreviousSong}><img src="/back.svg" alt="back" /></button>
              <button onClick={handleNextSong}><img src="/next.svg" alt="next" /></button>
              <button onClick={fetchLyrics}>
                <img src="/lyrics.svg" alt="lyrics" />
              </button>
              <button onClick={handleShuffle} style={{ backgroundColor: isShuffle ? '#080808de' : '#1e1e1e85' }}>
                <img src="/shuffle.svg" alt="shuffle" />
              </button>
              <button onClick={() => setShowPlaylist(!showPlaylist)}><img src="/playlist.svg" alt="playlist" /></button>
            </div>
          </div>
        </div>
        <div className={styles.container2}>
          <div id="visualizer" className={styles.visualizer}>
            {isLoadingLyrics ? (
              <p>Chargement des paroles...</p>
            ) : (
              <LyricsDisplay lyrics={lyrics} />
            )}
          </div>
        </div>
      </div>

      {showPlaylist && (
        <div className={styles.playlist}>
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={playlist}>
              <ul>
                {playlist.map((song, index) => (
                  <SortableItem key={song.id} id={song.id}>
                    <p
                      style={{
                        color: index === currentSongIndex ? 'gold' : 'white',
                      }}
                    >
                      {song.name}
                    </p>
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;