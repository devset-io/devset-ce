package io.devset.ce.schemas;

import java.util.List;
import java.util.Optional;

interface SchemaRepository {

    Schema save(Schema schema);

    List<Schema> findAllByType(SchemaType type);

    Optional<Schema> findById(String id);

    void delete(String id);
}
