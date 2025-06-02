package io.devset.ce.schemas;

public record Schema(
        String id,
        SchemaType type,
        String name,
        String payload
) {
    public Schema update(String newName, String newPayload) {
        return new Schema(this.id, this.type, newName, newPayload);
    }
}
