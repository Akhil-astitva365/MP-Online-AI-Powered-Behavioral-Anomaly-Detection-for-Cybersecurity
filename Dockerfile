# SentinelAI Enterprise .NET 10 Multi-Stage Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY backend/BackendApi.csproj backend/
RUN dotnet restore backend/BackendApi.csproj
COPY backend/ backend/
RUN dotnet publish backend/BackendApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app
COPY --from=build /app/publish .
COPY data/ /data/

ENV ASPNETCORE_URLS=http://+:8000
EXPOSE 8000

ENTRYPOINT ["dotnet", "BackendApi.dll"]
