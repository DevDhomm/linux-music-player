'use client';
import { useEffect, useState, useRef } from 'react';
import { readDir, BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
import { parseBuffer } from 'music-metadata';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
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
  const audioMotionRef = useRef(null);

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
    if (!audioMotionRef.current && audioRef.current) {
      audioMotionRef.current = new AudioMotionAnalyzer(document.getElementById('visualizer'), {
        source: audioRef.current,
        "alphaBars": false,
        "ansiBands": false,
        "barSpace": 0.1,
        "bgAlpha": "0",
        "channelLayout": "single",
        "colorMode": "gradient",
        "fadePeaks": true,
        "fftSize": 256,
        "fillAlpha": 1,
        "frequencyScale": "linear",
        "gradient": "rainbow",
        "gravity": 3.8,
        "ledBars": true,
        "linearAmplitude": true,
        "linearBoost": 1.8,
        "lineWidth": 4,
        "loRes": false,
        "lumiBars": false,
        "maxDecibels": -25,
        "maxFPS": 0,
        "maxFreq": 8000,
        "minDecibels": -85,
        "minFreq": 100,
        "mirror": 0,
        "mode": 0,
        "noteLabels": false,
        "outlineBars": false,
        "overlay": true,
        "peakFadeTime": 750,
        "peakHoldTime": 500,
        "peakLine": true,
        "radial": false,
        "radialInvert": false,
        "radius": 0.3,
        "reflexAlpha": "0.3",
        "reflexBright": "0.9",
        "reflexFit": true,
        "reflexRatio": 0.3,
        "roundBars": false,
        "showBgColor": true,
        "showFPS": false,
        "showPeaks": true,
        "showScaleX": false,
        "showScaleY": false,
        "smoothing": 0.8,
        "spinSpeed": 0,
        "splitGradient": false,
        "trueLeds": false,
        "useCanvas": true,
        "volume": 1,
        "weightingFilter": ""
      });
    }
  }, [audioRef.current]);

  const shufflePlaylist = () => {
    let shuffled = [...playlist];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleSongEnd = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % playlist.length);
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
                    <h2>{metadata.common.title || playlist[currentSongIndex].name}</h2>

                </div>

              </div>
            )}


            <div className={styles.controls}>
              <audio autoPlay ref={audioRef} id="audioPlayer" controls onEnded={handleSongEnd}></audio>

              <div className={styles.btn}>
                <button onClick={handlePreviousSong}><img src="/back.svg" alt="back" /></button>
                <button onClick={handleNextSong}><img src="/next.svg" alt="next" /></button>
                <button onClick={handleShuffle} style={{ backgroundColor: isShuffle ? '#080808de' : '#1e1e1e85' }}>
                  <img src="/shuffle.svg" alt="shuffle" />
                </button>
                <button onClick={() => setShowPlaylist(!showPlaylist)}><img src="/playlist.svg" alt="playlist" /></button>
              </div>
            </div>


        </div>
        <div className={styles.container2}>
          <div id="visualizer" className={styles.visualizer}>
            
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
