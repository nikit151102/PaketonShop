/**
 * DTO для создания вопроса пользователя
 */
export interface UserQuestionCreateDTO {
    /** Дата и время создания вопроса */
    dateTime: string;
    /** Сообщение вопроса */
    requestMessage: FeedBackMessageCreateDTO;
    /** Сообщение ответа (необязательное) */
    responseMessage?: FeedBackMessageCreateDTO;
    /** ID товара */
    productId: string;
}

/**
 * DTO для сообщения (вопрос или ответ)
 */
export interface FeedBackMessageCreateDTO {
    /** Текст сообщения */
    text: string;
    /** Дата и время создания сообщения */
    dateTime: string;
}

/**
 * DTO одного вопроса/ответа пользователя
 */
export interface UserQuestionDto {
    id: string;
    product: {
        id: string;
        article: string;
        fullName: string;
        productImageLink: string;
    };
    requestMessage: {
        id: string;
        text: string;
        dateTime: string;
    };
    responseMessage?: {
        id: string;
        text: string;
        dateTime: string;
    };
}

/**
 * DTO для запроса фильтрации (пагинация, сортировка, фильтры)
 */
export interface QuestionQueryDto {
    filters?: Array<{ field: string; values: string[]; type: number }>;
    sorts?: Array<{ field: string; sortType: number }>;
    page: number;
    pageSize: number;
}
