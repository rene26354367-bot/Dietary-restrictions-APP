FROM node:20-alpine

# 建立工作目錄（包含整個 repo 結構）
WORKDIR /app

# 複製整個 repo（保留相對路徑，因為 server.cjs 需要 ../AppEngine）
COPY . .

# 進入後端所在目錄，安裝依賴
WORKDIR /app/APP_UI_草稿
RUN npm install

# 暴露後端 Port
EXPOSE 3001

# 啟動後端
CMD ["node", "server.cjs"]
