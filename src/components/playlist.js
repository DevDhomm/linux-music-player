'use client';
import { useEffect, useState, useRef } from 'react';
import { readDir, BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
import { parseBuffer } from 'music-metadata';

const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [metadata, setMetadata] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const entries = await readDir('Musique', { baseDir: BaseDirectory.Home });
        const songs = entries.map(entry => ({
          name: entry.name,
          path: `Musique/${entry.name}`,
        }));
        setPlaylist(songs);
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

          // Convertir en Blob pour lecture dans l'audio
          const blob = new Blob([new Uint8Array(fileContents)], { type: "audio/mp4" });
          const audioUrl = URL.createObjectURL(blob);

          // Ajouter la source de l'audio
          audioRef.current.src = audioUrl;
        } catch (error) {
          console.error('Erreur de lecture du fichier:', error);
        }
      };
      fetchMetadata(playlist[currentSongIndex].path);
    }
  }, [currentSongIndex, playlist]);

  const handleSongEnd = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % playlist.length);
  };

  const handleNextSong = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % playlist.length);
  };

  const handlePreviousSong = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex - 1 + playlist.length) % playlist.length);
  };

  return (
    <div>
      <h1>Lecteur de Musique</h1>
      <audio autoPlay ref={audioRef} id="audioPlayer" controls onEnded={handleSongEnd}></audio>
      {metadata && (
        <div>
          <h2>{metadata.common.title || playlist[currentSongIndex].name}</h2>
          {metadata.common.picture?.[0] && (
            <img
              src={URL.createObjectURL(new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format }))}
              alt="Cover"
            />
          )}
        </div>
      )}
      <button onClick={handlePreviousSong}>Précédent</button>
      <button onClick={handleNextSong}>Suivant</button>
      <ul>
        {[...playlist.slice(currentSongIndex + 1), ...playlist.slice(0, currentSongIndex)].map((song, index) => (
          <li key={index} onClick={() => setCurrentSongIndex((currentSongIndex + index + 1) % playlist.length)}>
            {song.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MusicPlayer;
