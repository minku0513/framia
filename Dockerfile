FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx index.html panorama.html portrait.html ratio.html *.css *.js /usr/share/nginx/html/
COPY --chown=nginx:nginx assets /usr/share/nginx/html/assets

EXPOSE 80
