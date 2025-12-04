# Containerfile pour Podman (identique au Dockerfile)
# Utiliser une image Node.js LTS officielle (Alpine pour réduire la taille)
FROM node:20-alpine

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (production uniquement)
RUN npm ci --only=production && \
    npm cache clean --force

# Copier le code de l'application
COPY --chown=nodejs:nodejs . .

# Créer les répertoires nécessaires avec les bonnes permissions
RUN mkdir -p blueprint_local/public/uploads \
             blueprint_local/intranet/projects/drafts \
             blueprint_local/public/projects/published \
             blueprint_local/intranet/projects/published_md \
             logs && \
    chown -R nodejs:nodejs blueprint_local logs

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 8000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=8000

# Healthcheck pour vérifier que l'application fonctionne
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "server.js"]

