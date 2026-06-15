package io.opsnext.api.contact.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class ContactRequest {

    public record Create(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        String title,
        String accountId,
        String ownerId,
        String source,
        String leadSource,
        List<String> tags,
        Boolean emailOptOut,
        Object phones,
        Object address,
        Object socialHandles,
        Object customFields
    ) {}

    public record Update(
        String firstName,
        String lastName,
        @Email String email,
        String title,
        String accountId,
        String ownerId,
        String source,
        String leadSource,
        List<String> tags,
        Boolean emailOptOut,
        Object phones,
        Object address,
        Object socialHandles,
        Object customFields
    ) {}
}
