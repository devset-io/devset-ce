package io.devset.ce.schemas.jpa;

import io.devset.ce.schemas.SchemaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchemaJpaRepository extends JpaRepository<SchemaEntity, String> {

    List<SchemaEntity> findAllByType(SchemaType type);

}
