package io.devset.ce.schemas;

import io.devset.ce.schemas.jpa.SchemaJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class SchemaRepositoryImpl implements SchemaRepository {

    private final SchemaJpaRepository schemaJpaRepository;
    private final SchemaJpaMapper schemaJpaMapper;

    @Override
    public Schema save(Schema schema) {
        var entity = schemaJpaRepository.save(schemaJpaMapper.mapToEntity(schema));
        return schemaJpaMapper.mapToDomain(entity);
    }

    @Override
    public List<Schema> findAllByType(SchemaType type) {
        return schemaJpaRepository.findAllByType(type)
                .stream()
                .map(schemaJpaMapper::mapToDomain)
                .toList();

    }

    @Override
    public Optional<Schema> findById(String id) {
        return schemaJpaRepository.findById(id).map(schemaJpaMapper::mapToDomain);
    }

    @Override
    public void delete(String id) {
        this.schemaJpaRepository.deleteById(id);
    }

}
