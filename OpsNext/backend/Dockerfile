# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

# Cache Gradle wrapper + dependency resolution layer
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon --quiet

# Build application
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S opsnext && adduser -S opsnext -G opsnext

WORKDIR /app

COPY --from=builder /workspace/build/libs/opsnext-api.jar app.jar

# OTEL Java agent (download at build time — pinned version)
ADD --chown=opsnext:opsnext \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.7.0/opentelemetry-javaagent.jar \
  /opt/otel/opentelemetry-javaagent.jar

USER opsnext

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}", \
  "-jar", "app.jar"]
