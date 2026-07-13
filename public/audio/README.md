# Prévias

Clipes de ~30s servidos direto daqui — sem Spotify, sem iframe, sem login.

Arquivos esperados (nomes vêm de `preview` em `src/components/Music.tsx`):

- `diabo.mp3`
- `em-seu-lugar.mp3`

Enquanto o arquivo não existir, o botão de play aparece mas volta ao repouso ao
clicar. Pra esconder o botão de uma faixa, é só apagar o campo `preview` dela.

Exportando com ffmpeg (30s a partir de 0:45, com fade nas pontas):

    ffmpeg -ss 45 -t 30 -i master-diabo.wav \
      -af "afade=t=in:st=45:d=1,afade=t=out:st=72:d=3" \
      -b:a 128k public/audio/diabo.mp3

128 kbps é suficiente pra prévia e mantém o arquivo em ~500 KB.
