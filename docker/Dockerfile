# Usa l'ultima versione stabile di Node.js
FROM node:23-slim

# Imposta la cartella di lavoro dentro il container
WORKDIR /app

# Copia i file del package.json e installa le dipendenze
COPY package.json package-lock.json ./
RUN npm install --production

# Copia il codice del server
COPY server/ src/ ./server/

# Imposta la directory di lavoro per il server
WORKDIR /app/server

# Esponi le porte necessarie
EXPOSE 443 3000

# Comando per avviare il server
CMD ["node", "server.js"]
