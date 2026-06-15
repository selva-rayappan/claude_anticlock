package io.opsnext.api.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendTenantInvitation(String toEmail, String slug, String setupLink) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject("Welcome to OpsNext — Set up your " + slug + " workspace");
            msg.setText("""
                    You have been invited to set up the OpsNext workspace '%s'.

                    Click the link below to create your password and get started (valid for 72 hours):
                    %s

                    If you did not expect this invitation, please ignore this email.
                    """.formatted(slug, setupLink));
            mailSender.send(msg);
            log.info("Tenant invitation sent: tenant={} email={}", slug, toEmail);
        } catch (Exception e) {
            log.error("Failed to send invitation email: tenant={} email={}", slug, toEmail, e);
        }
    }
}
