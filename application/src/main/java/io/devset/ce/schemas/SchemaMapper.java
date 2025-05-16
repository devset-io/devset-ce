package io.devset.ce.schemas;


import io.devset.ce.schemas.dto.NewSchemaDto;
import io.devset.ce.schemas.dto.SchemaDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SchemaMapper {

    @Mapping(target = "id", expression = "java(java.util.UUID.randomUUID().toString();)")
    Schema toDomain(NewSchemaDto schemaDto);

    SchemaDto toDto(Schema schemaDto);
}
