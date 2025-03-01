# Usa l'ultima versione stabile di Node.js compatibile con Raspberry Pi
FROM node:20

# Imposta la cartella di lavoro dentro il container
WORKDIR /app

# Copia i file del package.json e installa le dipendenze
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copia tutto il codice sorgente
COPY . .

# Esponi la porta 443 per HTTPS
EXPOSE 443

# Comando per avviare il server
CMD ["node", "server.js"]