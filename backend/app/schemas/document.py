from pydantic import BaseModel


class DocumentResponse(BaseModel):
    document_id: str
    title: str
    category: str
    content: str

    class Config:
        from_attributes = True