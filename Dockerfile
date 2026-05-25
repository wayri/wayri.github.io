FROM ruby:3.2-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN gem install bundler jekyll

WORKDIR /site

COPY Gemfile* ./
RUN bundle install 2>/dev/null || gem install jekyll-feed jekyll-seo-tag

EXPOSE 4000

CMD ["jekyll", "serve", "--host", "0.0.0.0", "--watch", "--force_polling", "--livereload"]
