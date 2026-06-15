import org.springframework.boot.gradle.tasks.run.BootRun

plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "io.opsnext"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // Database
    implementation("org.postgresql:postgresql:42.7.4")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    // JWT (jjwt 0.12.x)
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // OpenAPI / Swagger UI
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0")

    // Redis client (Lettuce is default, include commons-pool for connection pooling)
    implementation("org.apache.commons:commons-pool2:2.12.0")

    // Utilities
    implementation("org.apache.commons:commons-lang3:3.17.0")
    implementation("commons-codec:commons-codec:1.17.1")
    implementation("com.google.guava:guava:33.3.1-jre")

    // JSON / Jackson extras
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    // Lombok (optional but reduces boilerplate)
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter:1.20.4")
    testImplementation("org.testcontainers:postgresql:1.20.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<BootRun>("bootRun") {
    environment("SPRING_PROFILES_ACTIVE", System.getProperty("spring.profiles.active", "dev"))
    jvmArgs("-Dfile.encoding=UTF-8")
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName.set("opsnext-api.jar")
}
