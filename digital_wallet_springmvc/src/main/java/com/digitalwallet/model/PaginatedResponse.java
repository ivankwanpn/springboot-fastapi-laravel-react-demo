package com.digitalwallet.model;

import java.util.List;

public class PaginatedResponse<T> {
    private List<T> data;
    private int page;
    private int size;
    private long total;

    public PaginatedResponse() {}

    public PaginatedResponse(List<T> data, int page, int size, long total) {
        this.data = data;
        this.page = page;
        this.size = size;
        this.total = total;
    }

    public List<T> getData() { return data; }
    public void setData(List<T> data) { this.data = data; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
}
